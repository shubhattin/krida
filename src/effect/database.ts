import { Context, Effect, Layer, Redacted } from 'effect';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { drizzle as drizzleNeonHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import {
  drizzle as drizzlePostgres,
  type PostgresJsDatabase,
  type PostgresJsQueryResultHKT
} from 'drizzle-orm/postgres-js';
import { neon, neonConfig } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from '~/db/schema';
import { AppConfig } from './config';
import { DatabaseError } from './errors';

// PlanetScale Postgres serves the Neon HTTP protocol at `https://<host>/sql` (required override).
neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;

export type DbClient = PostgresJsDatabase<typeof schema>;

/** One-shot HTTP (prod) or local postgres.js — no interactive transactions. */
export type DbHttpClient = PostgresJsDatabase<typeof schema> | NeonHttpDatabase<typeof schema>;

export type DbTransaction =
  | PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >
  | DbClient;

/** Tx, session client, or HTTP client — for helpers that only query/mutate rows. */
export type TxOrDb = DbTransaction | DbHttpClient;

/** Drizzle builders are Thenable but not typed as Promise — accept both. */
const tryDb = <A>(operation: string, run: () => A | PromiseLike<A>) =>
  Effect.tryPromise({
    try: async () => await run(),
    catch: (cause) => DatabaseError.make({ operation, cause })
  }).pipe(Effect.annotateLogs({ category: 'db', operation }));

/**
 * postgres.js TCP pool, one per server instance and shared by every request.
 * - Prod URL points at PlanetScale's PgBouncer (port 6432, transaction pooling), so prepared
 *   statements are off — a named statement would not survive a backend switch between queries.
 *   Kept off locally too so dev matches prod.
 * - Idle sockets close after 20s so a suspended instance or dev hot reload never pins slots.
 * `postgres()` only holds config; sockets open lazily on the first query.
 */
const createPostgres = (url: string, max: number) =>
  postgres(url, { prepare: false, max, idle_timeout: 20, max_lifetime: 60 * 30 });

const endPostgres = (sql: ReturnType<typeof postgres>) =>
  Effect.promise(async () => {
    try {
      await sql.end({ timeout: 5 });
    } catch {
      // Ignore cleanup failures during runtime dispose.
    }
  });

/**
 * Session driver: postgres.js over TCP (local Postgres in dev, PgBouncer in prod).
 * Default for everything — reads, admin writes, and interactive transactions.
 */
export class Database extends Context.Service<
  Database,
  {
    readonly run: <A>(
      operation: string,
      run: (client: DbClient) => A | PromiseLike<A>
    ) => Effect.Effect<A, DatabaseError>;
    readonly transaction: <A>(
      operation: string,
      run: (tx: DbTransaction) => A | PromiseLike<A>
    ) => Effect.Effect<A, DatabaseError>;
  }
>()('Database') {
  static readonly Live = Layer.effect(Database)(
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const url = Redacted.value(config.dbUrl);

      const sql = yield* Effect.acquireRelease(
        Effect.try({
          try: () => createPostgres(url, config.isDev ? 5 : 10),
          catch: (cause) => DatabaseError.make({ operation: 'connect', cause })
        }),
        endPostgres
      );
      const db = drizzlePostgres(sql, { schema });

      return {
        run: (operation, run) => tryDb(operation, () => run(db)),
        transaction: (operation, run) =>
          tryDb(operation, () => db.transaction(async (tx) => await run(tx)))
      };
    })
  );
}

/**
 * Stateless HTTP driver (PlanetScale `/sql` via the Neon HTTP client in prod, postgres.js locally).
 * Only for public data-collection writes, so bursts of anonymous traffic never take TCP slots.
 * Everything else uses `Database`. No interactive transactions.
 */
export class DatabaseHttp extends Context.Service<
  DatabaseHttp,
  {
    readonly run: <A>(
      operation: string,
      run: (client: DbHttpClient) => A | PromiseLike<A>
    ) => Effect.Effect<A, DatabaseError>;
  }
>()('DatabaseHttp') {
  static readonly Live = Layer.effect(DatabaseHttp)(
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const url = Redacted.value(config.dbUrl);

      if (!config.isDev) {
        const db = yield* Effect.try({
          try: () => drizzleNeonHttp(neon(url), { schema }),
          catch: (cause) => DatabaseError.make({ operation: 'connect', cause })
        });
        return { run: (operation, run) => tryDb(operation, () => run(db)) };
      }

      const sql = yield* Effect.acquireRelease(
        Effect.try({
          try: () => createPostgres(url, 2),
          catch: (cause) => DatabaseError.make({ operation: 'connect', cause })
        }),
        endPostgres
      );
      const db = drizzlePostgres(sql, { schema });
      return { run: (operation, run) => tryDb(operation, () => run(db)) };
    })
  );
}

export const dbRun = <A>(operation: string, run: (client: DbClient) => A | PromiseLike<A>) =>
  Effect.gen(function* () {
    const database = yield* Database;
    return yield* database.run(operation, run);
  });

/** Public data-collection writes only — see `DatabaseHttp`. */
export const dbRunHttp = <A>(
  operation: string,
  run: (client: DbHttpClient) => A | PromiseLike<A>
) =>
  Effect.gen(function* () {
    const database = yield* DatabaseHttp;
    return yield* database.run(operation, run);
  });

export const dbTransaction = <A>(
  operation: string,
  run: (tx: DbTransaction) => A | PromiseLike<A>
) =>
  Effect.gen(function* () {
    const database = yield* Database;
    return yield* database.transaction(operation, run);
  });

import { Context, Effect, Layer, Redacted } from 'effect';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import {
  drizzle as drizzleNeon,
  type NeonDatabase,
  type NeonQueryResultHKT
} from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import {
  drizzle as drizzlePostgres,
  type PostgresJsDatabase,
  type PostgresJsQueryResultHKT
} from 'drizzle-orm/postgres-js';
import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from '~/db/schema';
import { AppConfig } from './config';
import { DatabaseError } from './errors';

export type DbClient = PostgresJsDatabase<typeof schema> | NeonDatabase<typeof schema>;

/** One-shot HTTP (prod) or local postgres.js — no interactive transactions. */
export type DbHttpClient = PostgresJsDatabase<typeof schema> | NeonHttpDatabase<typeof schema>;

export type DbTransaction =
  | PgTransaction<NeonQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>
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
 * Session driver (TCP locally, Neon WebSocket Pool in prod).
 *
 * `postgres()` / `new Pool()` only hold config — the TCP or WebSocket is opened
 * lazily on the first query, which is why construction is not awaited.
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

      const owned = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: async () => {
            if (config.isDev) {
              const sql = postgres(url);
              return {
                kind: 'postgres' as const,
                sql,
                db: drizzlePostgres(sql, { schema })
              };
            }
            const pool = new Pool({ connectionString: url });
            return {
              kind: 'neon' as const,
              pool,
              db: drizzleNeon(pool, { schema })
            };
          },
          catch: (cause) => DatabaseError.make({ operation: 'connect', cause })
        }),
        (client) =>
          Effect.promise(async () => {
            try {
              if (client.kind === 'postgres') await client.sql.end({ timeout: 5 });
              else await client.pool.end();
            } catch {
              // Ignore cleanup failures during runtime dispose.
            }
          })
      );

      return {
        run: (operation, run) => tryDb(operation, () => run(owned.db)),
        transaction: (operation, run) =>
          tryDb(operation, () => owned.db.transaction(async (tx) => run(tx)))
      };
    })
  );

  /**
   * Workers-safe driver for workerd (Miniflare / production Workers).
   *
   * Cloudflare isolates I/O objects (TCP/WebSocket) to the request that created
   * them, so a singleton `postgres` / Neon `Pool` dies on the second request.
   * Both local and prod open a fresh client per query and close it after.
   *
   * - Local (`isDev`): postgres.js against local Postgres
   * - Prod: Neon WebSocket `Pool`
   */
  static readonly WorkersLive = Layer.effect(Database)(
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const url = Redacted.value(config.dbUrl);

      const withClient = async <A>(run: (db: DbClient) => A | PromiseLike<A>): Promise<A> => {
        if (config.isDev) {
          const sql = postgres(url, { max: 1, connect_timeout: 8, idle_timeout: 5 });
          try {
            return await run(drizzlePostgres(sql, { schema }));
          } finally {
            await sql.end({ timeout: 2 });
          }
        }

        if (globalThis.WebSocket) {
          neonConfig.webSocketConstructor = globalThis.WebSocket;
        }
        const pool = new Pool({ connectionString: url, max: 1 });
        try {
          return await run(drizzleNeon(pool, { schema }));
        } finally {
          await pool.end();
        }
      };

      return {
        run: (operation, run) => tryDb(operation, () => withClient(run)),
        transaction: (operation, run) =>
          tryDb(operation, () => withClient((db) => db.transaction(async (tx) => run(tx))))
      };
    })
  );
}

/**
 * Stateless HTTP driver for one-shot queries (Neon `fetch` in prod, postgres.js locally).
 * Use `Database` for interactive transactions. Prod HTTP never holds a socket,
 * which is ideal for Cloudflare isolates where WebSocket/TCP objects cannot be shared.
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

      type OwnedClient =
        | {
            kind: 'postgres';
            sql: ReturnType<typeof postgres>;
            db: PostgresJsDatabase<typeof schema>;
          }
        | {
            kind: 'neon-http';
            db: NeonHttpDatabase<typeof schema>;
          };

      const owned = yield* Effect.acquireRelease(
        Effect.try({
          try: (): OwnedClient => {
            if (config.isDev) {
              const sql = postgres(url);
              return {
                kind: 'postgres',
                sql,
                db: drizzlePostgres(sql, { schema })
              };
            }
            return {
              kind: 'neon-http',
              db: drizzleNeonHttp(neon(url), { schema })
            };
          },
          catch: (cause) => DatabaseError.make({ operation: 'connect', cause })
        }),
        (client) =>
          Effect.promise(async () => {
            try {
              if (client.kind === 'postgres') await client.sql.end({ timeout: 5 });
            } catch {
              // Ignore cleanup failures during runtime dispose.
            }
          })
      );

      return {
        run: (operation, run) => tryDb(operation, () => run(owned.db))
      };
    })
  );

  /**
   * Workers-safe HTTP driver for workerd (Miniflare / production Workers).
   *
   * Prod uses Neon HTTP (`fetch`) — stateless, no socket or WebSocket to isolate.
   * Local dev opens a fresh postgres.js client per query and closes it after,
   * matching `Database.WorkersLive` lifecycle.
   */
  static readonly WorkersLive = Layer.effect(DatabaseHttp)(
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const url = Redacted.value(config.dbUrl);

      const withClient = async <A>(run: (db: DbHttpClient) => A | PromiseLike<A>): Promise<A> => {
        if (config.isDev) {
          const sql = postgres(url, { max: 1, connect_timeout: 8, idle_timeout: 5 });
          try {
            return await run(drizzlePostgres(sql, { schema }));
          } finally {
            await sql.end({ timeout: 2 });
          }
        }
        return await run(drizzleNeonHttp(neon(url), { schema }));
      };

      return {
        run: (operation, run) => tryDb(operation, () => withClient(run))
      };
    })
  );
}

export const dbRun = <A>(operation: string, run: (client: DbClient) => A | PromiseLike<A>) =>
  Effect.gen(function* () {
    const database = yield* Database;
    return yield* database.run(operation, run);
  });

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

/**
 * Illustrative Database Lives.
 *
 * Same service tag. Node keeps a pool. workerd opens a client per query and
 * closes it — sockets must not outlive the request that created them.
 */
import { Context, Effect, Layer } from 'effect';

export class Database extends Context.Service<
  Database,
  {
    readonly run: <A>(fn: () => Promise<A>) => Effect.Effect<A>;
  }
>()('Database') {
  /** Node / Vercel — long-lived client. Admin sessions, advisory locks. */
  static readonly Live = Layer.effect(Database)(
    Effect.sync(() => {
      const pool = openPool(); // lives until runtime dispose
      return {
        run: (fn) => Effect.tryPromise(() => fnWith(pool, fn))
      };
    })
  );

  /** workerd (prod and `bun run dev`) — no retained TCP / WebSocket. */
  static readonly WorkersLive = Layer.succeed(Database)({
    run: (fn) =>
      Effect.tryPromise(async () => {
        const client = openClient();
        try {
          return await fnWith(client, fn);
        } finally {
          await client.end();
        }
      })
  });
}

export const dbRun = <A>(fn: () => Promise<A>) =>
  Effect.gen(function* () {
    const database = yield* Database;
    return yield* database.run(fn);
  });

// Stubs for the sketch.
declare function openPool(): { end(): Promise<void> };
declare function openClient(): { end(): Promise<void> };
declare function fnWith<A>(client: unknown, fn: () => Promise<A>): Promise<A>;

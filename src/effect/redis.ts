import { Context, Effect, Layer, Redacted } from 'effect';
import { Redis, type SetCommandOptions } from '@upstash/redis';
import { AppConfig } from './config';
import { RedisError } from './errors';

const tryRedis = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => RedisError.make({ operation, cause })
  }).pipe(Effect.annotateLogs({ category: 'cache', operation }));

export class RedisClient extends Context.Service<
  RedisClient,
  {
    readonly get: <T = unknown>(key: string) => Effect.Effect<T | null, RedisError>;
    readonly set: (
      key: string,
      value: unknown,
      options?: SetCommandOptions
    ) => Effect.Effect<unknown, RedisError>;
    readonly del: (...keys: string[]) => Effect.Effect<number, RedisError>;
    readonly incr: (key: string) => Effect.Effect<number, RedisError>;
    readonly eval: (
      script: string,
      keys: string[],
      args: (string | number)[]
    ) => Effect.Effect<unknown, RedisError>;
  }
>()('RedisClient') {
  static readonly Live = Layer.effect(RedisClient)(
    Effect.gen(function* () {
      const config = yield* AppConfig;
      // Upstash REST — safe to construct per layer build (no TCP connection pool).
      const redis = new Redis({
        url: config.upstashRedisUrl,
        token: Redacted.value(config.upstashRedisToken)
      });

      return {
        get: <T = unknown>(key: string) => tryRedis('get', () => redis.get<T>(key)),
        set: (key: string, value: unknown, options?: SetCommandOptions) =>
          tryRedis('set', () => (options ? redis.set(key, value, options) : redis.set(key, value))),
        del: (...keys: string[]) => tryRedis('del', () => redis.del(...keys)),
        incr: (key: string) => tryRedis('incr', () => redis.incr(key)),
        eval: (script: string, keys: string[], args: (string | number)[]) =>
          tryRedis('eval', () => redis.eval(script, keys, args))
      };
    })
  );
}

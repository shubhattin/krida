import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { createCache, getCachedMany } from './cache';
import { AppConfig } from './config';
import { RedisClient } from './redis';
import { BackgroundWork } from './background';
import { DatabaseHttp } from './database';
import { AiProvider } from './ai';
import { CacheError } from './errors';

type Stored = string | number;

const memoryRedis = ({ failMget = false } = {}) => {
  const store = new Map<string, Stored>();
  const calls = { get: 0, mget: 0 };
  // SAFETY: in-memory stand-in for the subset of RedisClient that createCache uses
  const client = {
    get: (key: string) =>
      Effect.sync(() => {
        calls.get++;
        return store.get(key) ?? null;
      }),
    mget: (keys: string[]) =>
      failMget
        ? Effect.fail(CacheError.make({ operation: 'mget', cause: new Error('down') }))
        : Effect.sync(() => {
            calls.mget++;
            return keys.map((key) => store.get(key) ?? null);
          }),
    set: (key: string, value: Stored, opts?: { nx?: boolean }) =>
      Effect.sync(() => {
        if (opts?.nx && store.has(key)) return null;
        store.set(key, value);
        return 'OK';
      }),
    del: (...keys: string[]) => Effect.sync(() => keys.filter((k) => store.delete(k)).length),
    incr: (key: string) =>
      Effect.sync(() => {
        const n = Number(store.get(key) ?? 0) + 1;
        store.set(key, n);
        return n;
      }),
    eval: (_script: string, keys: string[]) =>
      Effect.sync(() => {
        store.delete(keys[0]!);
        return 1;
      })
  } as never;
  return { store, client, calls };
};

type Services = RedisClient | AppConfig | BackgroundWork | DatabaseHttp | AiProvider;

// SAFETY: createCache reads only `isProd` from config; with synchronous writes it never touches
// the database, AI provider or background queue, so empty stand-ins are sufficient
const testConfig = { isProd: true } as never;
// SAFETY: see above — only `enqueue` exists on the real service and it is not reached here
const noBackground = { enqueue: () => Effect.void } as never;
// SAFETY: see above — never used by createCache on these paths
const unused = {} as never;

const run = <A>(effect: Effect.Effect<A, CacheError, Services>, redis: never) =>
  Effect.runPromiseExit(
    effect.pipe(
      Effect.provideService(RedisClient, redis),
      Effect.provideService(AppConfig, testConfig),
      Effect.provideService(BackgroundWork, noBackground),
      Effect.provideService(DatabaseHttp, unused),
      Effect.provideService(AiProvider, unused)
    )
  );

describe('createCache failureTtlSeconds', () => {
  it('backs off after a failed fetch instead of fetching again, until deleted', async () => {
    const { store, client } = memoryRedis();
    let fetches = 0;
    const cache = createCache<{ slug: string }, string>({
      getKey: ({ slug }) => `t:${slug}`,
      ttlSeconds: Infinity,
      useSingleFlight: true,
      failureTtlSeconds: 600,
      fetch: () =>
        Effect.suspend(() => {
          fetches++;
          return Effect.fail(CacheError.make({ operation: 'fetch', cause: new Error('model') }));
        })
    });

    const first = await run(cache.get({ slug: 'a' }), client);
    const second = await run(cache.get({ slug: 'a' }), client);
    expect(first._tag).toBe('Failure');
    expect(second._tag).toBe('Failure');
    expect(fetches).toBe(1);
    expect(store.has('t:a:fail')).toBe(true);

    await run(cache.delete({ slug: 'a' }), client);
    expect(store.has('t:a:fail')).toBe(false);
    await run(cache.get({ slug: 'a' }), client);
    expect(fetches).toBe(2);
  });

  it('caches successes normally', async () => {
    const { client } = memoryRedis();
    let fetches = 0;
    const cache = createCache<{ slug: string }, string>({
      getKey: ({ slug }) => `t:${slug}`,
      ttlSeconds: Infinity,
      useSingleFlight: true,
      failureTtlSeconds: 600,
      fetch: () => Effect.sync(() => `v${++fetches}`)
    });
    await run(cache.get({ slug: 'b' }), client);
    const again = await run(cache.get({ slug: 'b' }), client);
    expect(again).toMatchObject({ _tag: 'Success', value: 'v1' });
    expect(fetches).toBe(1);
  });
});

describe('getCachedMany', () => {
  const counted = (prefix: string) => {
    const state = { fetches: 0 };
    const cache = createCache<{ slug: string }, string>({
      getKey: ({ slug }) => `${prefix}:${slug}`,
      ttlSeconds: Infinity,
      fetch: ({ slug }) => Effect.sync(() => `${prefix}-${slug}-${++state.fetches}`)
    });
    return { cache, state };
  };

  it('reads every key in one MGET and only fetches the misses', async () => {
    const { store, client, calls } = memoryRedis();
    const a = counted('a');
    const b = counted('b');
    store.set('a:x', 'cached-a');

    const exit = await run(
      getCachedMany({ first: a.cache.read({ slug: 'x' }), second: b.cache.read({ slug: 'y' }) }),
      client
    );

    expect(exit).toMatchObject({ _tag: 'Success', value: { first: 'cached-a', second: 'b-y-1' } });
    expect(calls).toEqual({ mget: 1, get: 0 });
    expect(a.state.fetches).toBe(0);
    expect(b.state.fetches).toBe(1);
  });

  it('falls back to per-item reads when MGET fails', async () => {
    const { store, client, calls } = memoryRedis({ failMget: true });
    const a = counted('a');
    store.set('a:x', 'cached-a');

    const exit = await run(getCachedMany({ first: a.cache.read({ slug: 'x' }) }), client);

    expect(exit).toMatchObject({ _tag: 'Success', value: { first: 'cached-a' } });
    expect(calls.get).toBe(1);
    expect(a.state.fetches).toBe(0);
  });
});

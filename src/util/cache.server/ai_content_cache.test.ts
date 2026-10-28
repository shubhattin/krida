import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { z } from 'zod';
import { AppConfig } from '~/effect/config';
import { RedisClient, type RedisJsonValue } from '~/effect/redis';
import { BackgroundWork } from '~/effect/background';
import { DatabaseHttp } from '~/effect/database';
import { AiProvider } from '~/effect/ai';
import { type CacheError, type ConflictError } from '~/effect/errors';
import { createAiContentCache, type StoredAiContent } from './ai_content_cache';

type Inputs = { words: string[] };
type Data = { words: string[] };

const memoryRedis = () => {
  const store = new Map<string, RedisJsonValue>();
  // SAFETY: in-memory stand-in for the subset of RedisClient that createCache uses
  const client = {
    get: (key: string) => Effect.sync(() => store.get(key) ?? null),
    set: (key: string, value: RedisJsonValue, opts?: { nx?: boolean }) =>
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
    eval: (_script: string, keys: string[], args: string[]) =>
      Effect.sync(() => {
        if (keys.length === 2) {
          // Guarded SET: write only while the generation is unchanged
          if (String(store.get(keys[1]!) ?? 0) !== args[0]) return 0;
          store.set(keys[0]!, JSON.parse(args[1]!));
          return 1;
        }
        // Lock release
        store.delete(keys[0]!);
        return 1;
      })
  } as never;
  return { store, client };
};

// SAFETY: only `isProd` is read from config
const testConfig = { isProd: true } as never;
// SAFETY: background work is not reached by `get` with single-flight synchronous writes
const noBackground = { enqueue: () => Effect.void } as never;
// SAFETY: the fake load/save/generate below never touch the database or AI provider
const unused = {} as never;

type Services = RedisClient | AppConfig | BackgroundWork | DatabaseHttp | AiProvider;

const run = <A>(effect: Effect.Effect<A, CacheError | ConflictError, Services>, redis: never) =>
  Effect.runPromiseExit(
    effect.pipe(
      Effect.provideService(RedisClient, redis),
      Effect.provideService(AppConfig, testConfig),
      Effect.provideService(BackgroundWork, noBackground),
      Effect.provideService(DatabaseHttp, unused),
      Effect.provideService(AiProvider, unused)
    )
  );

const hashOf = (inputs: Inputs) => inputs.words.join('|');

const setup = (stored: Omit<StoredAiContent<Inputs>, 'slug'>, { saveSucceeds = true } = {}) => {
  const saves: { data: Data; hash: string; previousHash: string | null }[] = [];
  const calls = { generate: 0, saves };
  const cache = createAiContentCache<Inputs, Data>({
    getKey: (id) => `t:v1:${id}`,
    schema: z.object({ words: z.string().array() }),
    inputHash: hashOf,
    load: () => Effect.succeed({ ...stored, slug: 'demo' }),
    generate: ({ inputs }) =>
      Effect.sync(() => {
        calls.generate++;
        return { words: inputs.words.map((w) => `${w}:new`) };
      }),
    save: ({ data, hash, previousHash }) =>
      Effect.sync(() => {
        calls.saves.push({ data, hash, previousHash });
        return saveSucceeds;
      })
  });
  return { cache, calls };
};

const inputs = { words: ['a', 'b'] };

describe('createAiContentCache', () => {
  it('serves stored output whose hash matches the current inputs without generating', async () => {
    const { client, store } = memoryRedis();
    const { cache, calls } = setup({ inputs, data: { words: ['a:old', 'b:old'] }, hash: 'a|b' });
    const result = await run(cache.get({ puzzle_id: 1 }), client);
    expect(result).toMatchObject({ _tag: 'Success', value: { words: ['a:old', 'b:old'] } });
    expect(calls.generate).toBe(0);
    expect(store.get('t:v1:1')).toEqual({ words: ['a:old', 'b:old'] });
  });

  it('regenerates and saves when the stored hash is stale', async () => {
    const { client } = memoryRedis();
    const { cache, calls } = setup({ inputs, data: { words: ['x'] }, hash: 'old-hash' });
    const result = await run(cache.get({ puzzle_id: 1 }), client);
    expect(result).toMatchObject({ _tag: 'Success', value: { words: ['a:new', 'b:new'] } });
    expect(calls.generate).toBe(1);
    // The write is conditioned on the hash this run loaded, so an older run can't overwrite it
    expect(calls.saves).toEqual([
      { data: { words: ['a:new', 'b:new'] }, hash: 'a|b', previousHash: 'old-hash' }
    ]);
  });

  it('regenerate saves, drops the Redis copy and returns the new output', async () => {
    const { client, store } = memoryRedis();
    store.set('t:v1:1', { words: ['a:old', 'b:old'] });
    const { cache, calls } = setup({ inputs, data: { words: ['a:old', 'b:old'] }, hash: 'a|b' });
    const result = await run(cache.regenerate(1), client);
    expect(result).toMatchObject({ _tag: 'Success', value: { words: ['a:new', 'b:new'] } });
    expect(calls.generate).toBe(1);
    expect(store.has('t:v1:1')).toBe(false);
  });

  it('regenerate reports a conflict when an edit stopped the save', async () => {
    const { client, store } = memoryRedis();
    store.set('t:v1:1', { words: ['a:old', 'b:old'] });
    const { cache } = setup(
      { inputs, data: { words: ['a:old', 'b:old'] }, hash: 'a|b' },
      { saveSucceeds: false }
    );
    const result = await run(cache.regenerate(1), client);
    expect(result._tag).toBe('Failure');
    expect(JSON.stringify(result)).toContain('ConflictError');
    expect(store.get('t:v1:1')).toEqual({ words: ['a:old', 'b:old'] });
  });
});

import ms from 'ms';
import type { ZodType } from 'zod';
import type { SetCommandOptions } from '@upstash/redis';
import { waitUntil } from '@vercel/functions';
import { redis, redis_generation_key } from '~/db/redis';
import { delay } from '~/tools/delay';

const DEFAULT_TTL_S = ms('60days') / 1000;
const DEV_DELAY_MS = 350;
const IS_PROD = process.env.NODE_ENV === 'production';

const defer_promise = (promise: Promise<unknown>) => {
  waitUntil(promise);
  void promise.catch(() => {});
};

export type CachedLoaderFn<TParams, TData> = (params: TParams) => Promise<TData>;

export type CachedLoaderRefreshOptions = {
  /** Delete the redis key before fetching fresh data. Default true. */
  deleteFirst?: boolean;
};

export type CachedLoader<TParams, TData> = {
  get: CachedLoaderFn<TParams, TData>;
  delete: (params: TParams) => Promise<void>;
  refresh: (params: TParams, opts?: CachedLoaderRefreshOptions) => Promise<void>;
  key: (params: TParams) => Promise<string>;
};

export type CreateCachedLoaderConfig<TParams, TCached, TData = TCached> = {
  getKey: (params: TParams) => string | Promise<string>;
  fetch: (params: TParams) => Promise<TCached>;
  /** Parsed on cache hit (e.g. coerce timestamp strings to Date). */
  schema?: ZodType<TCached>;
  /** Applied after read from cache or DB (e.g. array → Map). */
  transform?: (data: TCached) => TData;
  /** Seconds until expiry. Use `Infinity` for a permanent key (SET with no TTL). */
  ttlSeconds?: number;
  /** Dynamic TTL per fetched value (overrides ttlSeconds when returned). */
  getSetOptions?: (data: TCached) => SetCommandOptions | undefined;
  /** Skip redis.set when false (e.g. null lookup results). */
  shouldCache?: (data: TCached) => boolean;
  /** Serialize value before writing to redis (e.g. undefined → sentinel string). */
  toCacheValue?: (data: TCached) => unknown;
  /** Deserialize from redis; return null to treat as cache miss. */
  fromCacheValue?: (raw: unknown) => TCached | null;
  /**
   * When true, bump a per-key generation on delete and only SET after fetch if
   * the generation is unchanged — drops stale writes from overlapping refreshes.
   */
  useGenerationGuard?: boolean;
};

/** Snapshot of generation for a guarded write; `unavailable` skips caching. */
type GenerationSnapshot =
  | { kind: 'unguarded' }
  | { kind: 'guarded'; gen: number }
  | { kind: 'unavailable' };

const to_return_value = <TCached, TData>(
  data: TCached,
  transform?: (data: TCached) => TData
): TData => (transform ? transform(data) : (data as unknown as TData));

const resolve_set_options = <TCached>(
  data: TCached,
  ttlSeconds: number,
  getSetOptions?: (data: TCached) => SetCommandOptions | undefined
): SetCommandOptions | undefined => {
  if (getSetOptions) return getSetOptions(data);
  // Non-finite (e.g. Infinity) → omit EX so Redis keeps the key indefinitely.
  if (!Number.isFinite(ttlSeconds)) return undefined;
  return { ex: ttlSeconds };
};

const serialize_cache_value = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value);

/** Encode SET options for the generation-guard Lua script. */
const encode_set_options_for_script = (
  setOptions?: SetCommandOptions
): { mode: string; arg: string } => {
  if (!setOptions) return { mode: '', arg: '' };
  if ('ex' in setOptions && typeof setOptions.ex === 'number') {
    return { mode: 'EX', arg: String(setOptions.ex) };
  }
  if ('px' in setOptions && typeof setOptions.px === 'number') {
    return { mode: 'PX', arg: String(setOptions.px) };
  }
  if ('exat' in setOptions && typeof setOptions.exat === 'number') {
    return { mode: 'EXAT', arg: String(setOptions.exat) };
  }
  if ('pxat' in setOptions && typeof setOptions.pxat === 'number') {
    return { mode: 'PXAT', arg: String(setOptions.pxat) };
  }
  if ('keepTtl' in setOptions && setOptions.keepTtl) {
    return { mode: 'KEEPTTL', arg: '' };
  }
  return { mode: '', arg: '' };
};

/**
 * Atomically SET value_key only when gen_key still equals expectedGen.
 * Returns 1 if written, 0 if generation mismatched.
 */
const SET_IF_GENERATION_MATCHES = `
local current = redis.call('GET', KEYS[2])
if not current then current = '0' end
if tostring(current) ~= tostring(ARGV[1]) then
  return 0
end
local mode = ARGV[3]
if mode == '' then
  redis.call('SET', KEYS[1], ARGV[2])
elseif mode == 'KEEPTTL' then
  redis.call('SET', KEYS[1], ARGV[2], 'KEEPTTL')
else
  redis.call('SET', KEYS[1], ARGV[2], mode, ARGV[4])
end
return 1
`;

const set_cache_value = (cache_key: string, value: unknown, setOptions?: SetCommandOptions) =>
  setOptions ? redis.set(cache_key, value, setOptions) : redis.set(cache_key, value);

const set_cache_value_if_generation_matches = async (
  cache_key: string,
  value: unknown,
  expectedGen: number,
  setOptions?: SetCommandOptions
) => {
  const { mode, arg } = encode_set_options_for_script(setOptions);
  await redis.eval(
    SET_IF_GENERATION_MATCHES,
    [cache_key, redis_generation_key(cache_key)],
    [String(expectedGen), serialize_cache_value(value), mode, arg]
  );
};

const read_generation = async (cache_key: string): Promise<number> => {
  const raw = await redis.get<number | string | null>(redis_generation_key(cache_key));
  if (raw === null || raw === undefined) return 0;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
};

const snapshot_generation = async (
  cache_key: string,
  useGenerationGuard: boolean
): Promise<GenerationSnapshot> => {
  if (!useGenerationGuard) return { kind: 'unguarded' };
  try {
    return { kind: 'guarded', gen: await read_generation(cache_key) };
  } catch {
    // Redis gen unavailable — still serve fetched data, but do not cache it.
    return { kind: 'unavailable' };
  }
};

const write_with_generation_snapshot = async (
  cache_key: string,
  value: unknown,
  setOptions: SetCommandOptions | undefined,
  snapshot: GenerationSnapshot
) => {
  if (snapshot.kind === 'unavailable') return;
  if (snapshot.kind === 'unguarded') {
    await set_cache_value(cache_key, value, setOptions);
    return;
  }
  await set_cache_value_if_generation_matches(cache_key, value, snapshot.gen, setOptions);
};

export function createCachedLoader<TParams, TCached, TData = TCached>(
  config: CreateCachedLoaderConfig<TParams, TCached, TData>
): CachedLoader<TParams, TData> {
  const ttlSeconds = config.ttlSeconds ?? DEFAULT_TTL_S;
  const shouldCache = config.shouldCache ?? (() => true);
  const toCacheValue = config.toCacheValue ?? ((data: TCached) => data);
  const useGenerationGuard = config.useGenerationGuard ?? false;

  const resolve_key = (params: TParams) => Promise.resolve(config.getKey(params));

  const parse_cached = (raw: unknown): TCached | null => {
    if (config.fromCacheValue) {
      return config.fromCacheValue(raw);
    }
    if (raw === null || raw === undefined) return null;
    return config.schema ? config.schema.parse(raw) : (raw as TCached);
  };

  const get: CachedLoaderFn<TParams, TData> = async (params) => {
    const cache_key = await resolve_key(params);

    if (IS_PROD) {
      try {
        const cached = await redis.get<unknown>(cache_key);
        const parsed = parse_cached(cached);
        if (parsed !== null) {
          return to_return_value(parsed, config.transform);
        }
      } catch {
        // Treat Redis or parse failures as cache miss.
      }
    } else {
      await delay(DEV_DELAY_MS);
    }

    const genSnapshot =
      IS_PROD && useGenerationGuard
        ? await snapshot_generation(cache_key, true)
        : ({ kind: 'unguarded' } satisfies GenerationSnapshot);
    const fetched = await config.fetch(params);

    if (IS_PROD && shouldCache(fetched) && genSnapshot.kind !== 'unavailable') {
      const setOptions = resolve_set_options(fetched, ttlSeconds, config.getSetOptions);
      defer_promise(
        write_with_generation_snapshot(cache_key, toCacheValue(fetched), setOptions, genSnapshot)
      );
    }

    return to_return_value(fetched, config.transform);
  };

  const delete_cache = async (params: TParams) => {
    if (!IS_PROD) {
      await delay(DEV_DELAY_MS);
      return;
    }

    const cache_key = await resolve_key(params);
    if (useGenerationGuard) {
      await redis.incr(redis_generation_key(cache_key));
    }
    await redis.del(cache_key);
  };

  const refresh = async (
    params: TParams,
    { deleteFirst = true }: CachedLoaderRefreshOptions = {}
  ) => {
    if (!IS_PROD) {
      await delay(DEV_DELAY_MS);
      return;
    }

    if (deleteFirst) {
      await delete_cache(params);
    }

    // Capture gen before deferring so a later invalidate cannot adopt this refresh's token.
    const cache_key = await resolve_key(params);
    const genSnapshot = await snapshot_generation(cache_key, useGenerationGuard);

    const repopulate = async () => {
      if (genSnapshot.kind === 'unavailable') return;
      const fetched = await config.fetch(params);
      if (shouldCache(fetched)) {
        const setOptions = resolve_set_options(fetched, ttlSeconds, config.getSetOptions);
        await write_with_generation_snapshot(
          cache_key,
          toCacheValue(fetched),
          setOptions,
          genSnapshot
        );
      }
    };

    defer_promise(repopulate());
  };

  return {
    get,
    delete: delete_cache,
    refresh,
    key: resolve_key
  };
}

/** No-arg cache loaders use an empty params object. */
export type NoCacheParams = Record<string, never>;

export const NO_CACHE_PARAMS = {} as NoCacheParams;

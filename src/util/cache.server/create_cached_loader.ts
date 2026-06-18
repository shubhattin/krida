import ms from 'ms';
import type { ZodType } from 'zod';
import type { SetCommandOptions } from '@upstash/redis';
import { waitUntil } from '@vercel/functions';
import { redis } from '~/db/redis';
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
  ttlSeconds?: number;
  /** Dynamic TTL per fetched value (overrides ttlSeconds when returned). */
  getSetOptions?: (data: TCached) => SetCommandOptions | undefined;
  /** Skip redis.set when false (e.g. null lookup results). */
  shouldCache?: (data: TCached) => boolean;
  /** Serialize value before writing to redis (e.g. undefined → sentinel string). */
  toCacheValue?: (data: TCached) => unknown;
  /** Deserialize from redis; return null to treat as cache miss. */
  fromCacheValue?: (raw: unknown) => TCached | null;
};

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
  return { ex: ttlSeconds };
};

const set_cache_value = (cache_key: string, value: unknown, setOptions?: SetCommandOptions) =>
  setOptions ? redis.set(cache_key, value, setOptions) : redis.set(cache_key, value);

export function createCachedLoader<TParams, TCached, TData = TCached>(
  config: CreateCachedLoaderConfig<TParams, TCached, TData>
): CachedLoader<TParams, TData> {
  const ttlSeconds = config.ttlSeconds ?? DEFAULT_TTL_S;
  const shouldCache = config.shouldCache ?? (() => true);
  const toCacheValue = config.toCacheValue ?? ((data: TCached) => data);

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

    const fetched = await config.fetch(params);

    if (IS_PROD && shouldCache(fetched)) {
      const setOptions = resolve_set_options(fetched, ttlSeconds, config.getSetOptions);
      defer_promise(set_cache_value(cache_key, toCacheValue(fetched), setOptions));
    }

    return to_return_value(fetched, config.transform);
  };

  const delete_cache = async (params: TParams) => {
    if (!IS_PROD) {
      await delay(DEV_DELAY_MS);
      return;
    }

    const cache_key = await resolve_key(params);
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

    const repopulate = async () => {
      const cache_key = await resolve_key(params);
      const fetched = await config.fetch(params);
      if (shouldCache(fetched)) {
        const setOptions = resolve_set_options(fetched, ttlSeconds, config.getSetOptions);
        await set_cache_value(cache_key, toCacheValue(fetched), setOptions);
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

import { Effect, Duration } from 'effect';
import ms from 'ms';
import type { ZodType } from 'zod';
import type { SetCommandOptions } from '@upstash/redis';
import { RedisClient, type RedisJsonValue } from './redis';
import { CacheError } from './errors';
import { BackgroundWork } from './background';
import { AppConfig } from './config';
import { Database } from './database';
import { AiProvider } from './ai';

const DEFAULT_TTL_S = ms('60days') / 1000;
const DEV_DELAY = Duration.millis(350);
const SINGLE_FLIGHT_LOCK_TTL_MS = ms('5m');
const SINGLE_FLIGHT_POLL = Duration.millis(250);
const SINGLE_FLIGHT_MAX_POLLS = 120;

type CacheServices = RedisClient | BackgroundWork | AppConfig | Database | AiProvider;

export type CacheRefreshOptions = {
  /** Delete the redis key before fetching fresh data. Default true. */
  deleteFirst?: boolean;
};

export type CacheItem<TParams, TData> = {
  get: (params: TParams) => Effect.Effect<TData, CacheError, CacheServices>;
  delete: (params: TParams) => Effect.Effect<void, CacheError, RedisClient | AppConfig>;
  refresh: (
    params: TParams,
    opts?: CacheRefreshOptions
  ) => Effect.Effect<void, CacheError, CacheServices>;
  key: (params: TParams) => Effect.Effect<string>;
};

export type CreateCacheConfig<TParams, TCached, TData = TCached> = {
  getKey: (params: TParams) => string;
  fetch: (params: TParams) => Effect.Effect<TCached, CacheError, CacheServices>;
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
  toCacheValue?: (data: TCached) => TCached | string;
  /** Deserialize from redis; return null to treat as cache miss. */
  fromCacheValue?: (raw: RedisJsonValue) => TCached | null;
  /**
   * When true, bump a per-key generation on delete and only SET after fetch if
   * the generation is unchanged — drops stale writes from overlapping refreshes.
   */
  useGenerationGuard?: boolean;
  /**
   * Coordinate cache misses across instances so only one request fetches and
   * writes a value. Lock failures and bounded waits fall back to a direct fetch.
   */
  useSingleFlight?: boolean;
  /**
   * When true, use Redis get/set/delete/refresh even outside production.
   * Default caches are prod-only; set for expensive AI results that should
   * not re-hit the model on every local request.
   */
  cacheOutsideProd?: boolean;
};

/** Snapshot of generation for a guarded write; `unavailable` skips caching. */
type GenerationSnapshot =
  | { kind: 'unguarded' }
  | { kind: 'guarded'; gen: number }
  | { kind: 'unavailable' };

const redisGenerationKey = (cacheKey: string) => `${cacheKey}:gen`;

const toReturnValue = <TCached, TData>(
  data: TCached,
  transform?: (data: TCached) => TData
): TData => {
  if (transform) return transform(data);
  // SAFETY: without a transform the cache config's TData defaults to TCached, so
  // the cached value already satisfies the return type at every call site; the
  // intersection assertion keeps the evidence without a double cast.
  return data as TCached & TData;
};

const resolveSetOptions = <TCached>(
  data: TCached,
  ttlSeconds: number,
  getSetOptions?: (data: TCached) => SetCommandOptions | undefined
): SetCommandOptions | undefined => {
  if (getSetOptions) return getSetOptions(data);
  if (!Number.isFinite(ttlSeconds)) return undefined;
  return { ex: ttlSeconds };
};

/** Match Upstash REST `set` JSON encoding so guarded Lua writes store the same wire shape. */
const serializeCacheValue = <T>(value: T): string => JSON.stringify(value);

/** Wire `mode` tokens accepted by the guarded Lua set scripts. */
type RedisSetMode = '' | 'EX' | 'PX' | 'EXAT' | 'PXAT' | 'KEEPTTL';
type RedisSetOptionEncoding = { mode: RedisSetMode; arg: string };

const encodeSetOptionsForScript = (setOptions?: SetCommandOptions): RedisSetOptionEncoding => {
  if (!setOptions) return { mode: '', arg: '' };
  if ('ex' in setOptions) {
    return { mode: 'EX', arg: String(setOptions.ex) };
  }
  if ('px' in setOptions) {
    return { mode: 'PX', arg: String(setOptions.px) };
  }
  if ('exat' in setOptions) {
    return { mode: 'EXAT', arg: String(setOptions.exat) };
  }
  if ('pxat' in setOptions) {
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

/** Release a lock only when it is still owned by this caller. */
const RELEASE_LOCK_IF_OWNED = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

const toCacheError = (operation: string, key?: string) => (cause: unknown) =>
  CacheError.make({ operation, key, cause });

export function createCache<TParams, TCached, TData = TCached>(
  config: CreateCacheConfig<TParams, TCached, TData>
): CacheItem<TParams, TData> {
  const ttlSeconds = config.ttlSeconds ?? DEFAULT_TTL_S;
  const shouldCache = config.shouldCache ?? (() => true);
  const toCacheValue = config.toCacheValue ?? ((data: TCached) => data);
  const useGenerationGuard = config.useGenerationGuard ?? false;
  const useSingleFlight = config.useSingleFlight ?? false;
  const cacheOutsideProd = config.cacheOutsideProd ?? false;
  const inFlight = new Map<string, Effect.Effect<TData, CacheError, CacheServices>>();

  const redisActive = (isProd: boolean) => isProd || cacheOutsideProd;

  const parseCached = (raw: RedisJsonValue): TCached | null => {
    try {
      if (config.fromCacheValue) {
        return config.fromCacheValue(raw);
      }
      if (raw === null) {
        return null;
      }
      if (!config.schema) {
        // SAFETY: no schema configured means the cache stores/returns TCached verbatim
        return raw as TCached;
      }
      return config.schema.parse(raw);
    } catch {
      return null;
    }
  };

  const readGeneration = (cacheKey: string) =>
    Effect.gen(function* () {
      const redis = yield* RedisClient;
      const raw = yield* redis.get<number | string | null>(redisGenerationKey(cacheKey));
      if (raw === null || raw === undefined) return 0;
      // Number() is identity on numbers and parses the string form Redis may return.
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    });

  const snapshotGeneration = (cacheKey: string) =>
    Effect.gen(function* () {
      if (!useGenerationGuard) return { kind: 'unguarded' } as const satisfies GenerationSnapshot;
      return yield* readGeneration(cacheKey).pipe(
        Effect.map((gen) => ({ kind: 'guarded', gen }) as const),
        Effect.catch(() => Effect.succeed({ kind: 'unavailable' } as const))
      );
    });

  const writeWithGenerationSnapshot = (
    cacheKey: string,
    value: TCached | string,
    setOptions: SetCommandOptions | undefined,
    snapshot: GenerationSnapshot
  ) =>
    Effect.gen(function* () {
      if (snapshot.kind === 'unavailable') return;
      const redis = yield* RedisClient;
      if (snapshot.kind === 'unguarded') {
        yield* redis
          .set(cacheKey, value, setOptions)
          .pipe(Effect.mapError(toCacheError('set', cacheKey)));
        return;
      }
      const { mode, arg } = encodeSetOptionsForScript(setOptions);
      yield* redis
        .eval(
          SET_IF_GENERATION_MATCHES,
          [cacheKey, redisGenerationKey(cacheKey)],
          [String(snapshot.gen), serializeCacheValue(value), mode, arg]
        )
        .pipe(Effect.mapError(toCacheError('setIfGeneration', cacheKey)));
    });

  const fetchAndCache = (params: TParams, cacheKey: string, writeSynchronously: boolean) =>
    Effect.gen(function* () {
      const appConfig = yield* AppConfig;
      const background = yield* BackgroundWork;
      const genSnapshot =
        redisActive(appConfig.isProd) && useGenerationGuard
          ? yield* snapshotGeneration(cacheKey)
          : ({ kind: 'unguarded' } as const satisfies GenerationSnapshot);

      const fetched = yield* config
        .fetch(params)
        .pipe(
          Effect.mapError((cause) =>
            cause instanceof CacheError
              ? cause
              : CacheError.make({ operation: 'fetch', key: cacheKey, cause })
          )
        );

      if (
        redisActive(appConfig.isProd) &&
        shouldCache(fetched) &&
        genSnapshot.kind !== 'unavailable'
      ) {
        const setOptions = resolveSetOptions(fetched, ttlSeconds, config.getSetOptions);
        const write = writeWithGenerationSnapshot(
          cacheKey,
          toCacheValue(fetched),
          setOptions,
          genSnapshot
        );
        if (writeSynchronously) {
          yield* write;
        } else {
          const redis = yield* RedisClient;
          const database = yield* Database;
          const ai = yield* AiProvider;
          yield* background.enqueue(() =>
            Effect.runPromise(
              write.pipe(
                Effect.provideService(RedisClient, redis),
                Effect.provideService(Database, database),
                Effect.provideService(AiProvider, ai),
                Effect.provideService(AppConfig, appConfig),
                Effect.catch((error) =>
                  Effect.logWarning('cache set failed', { key: cacheKey, error }).pipe(
                    Effect.asVoid
                  )
                )
              )
            )
          );
        }
      }

      return toReturnValue(fetched, config.transform);
    });

  const get = Effect.fn('cache.get')(function* (params: TParams) {
    const appConfig = yield* AppConfig;
    const cacheKey = config.getKey(params);
    const useRedis = redisActive(appConfig.isProd);

    if (useRedis) {
      const redis = yield* RedisClient;
      const cached = yield* redis.get<RedisJsonValue>(cacheKey).pipe(
        Effect.catch(() => Effect.succeed<RedisJsonValue>(null)),
        Effect.annotateLogs({ category: 'cache', operation: 'get', key: cacheKey })
      );
      const parsed = parseCached(cached);
      if (parsed !== null) {
        return toReturnValue(parsed, config.transform);
      }
    } else {
      yield* Effect.sleep(DEV_DELAY);
    }

    if (!useRedis || !useSingleFlight) {
      return yield* fetchAndCache(params, cacheKey, false);
    }

    const localFlight = inFlight.get(cacheKey);
    if (localFlight) return yield* localFlight;

    const memoized = yield* Effect.cached(
      Effect.gen(function* () {
        const redis = yield* RedisClient;
        const lockKey = `${cacheKey}:lock`;
        const lockToken = crypto.randomUUID();

        let ownsLock = yield* redis
          .set(lockKey, lockToken, { nx: true, px: SINGLE_FLIGHT_LOCK_TTL_MS })
          .pipe(
            Effect.map((result) => Boolean(result)),
            Effect.catch(() => Effect.succeed(false))
          );

        if (
          !ownsLock &&
          !(yield* redis.get(lockKey).pipe(Effect.catch(() => Effect.succeed(null))))
        ) {
          // Redis lock coordination unavailable
          return yield* fetchAndCache(params, cacheKey, false);
        }

        const releaseLock = redis
          .eval(RELEASE_LOCK_IF_OWNED, [lockKey], [lockToken])
          .pipe(Effect.catch(() => Effect.void));

        if (ownsLock) {
          return yield* fetchAndCache(params, cacheKey, true).pipe(Effect.ensuring(releaseLock));
        }

        for (let poll = 0; poll < SINGLE_FLIGHT_MAX_POLLS; poll++) {
          yield* Effect.sleep(SINGLE_FLIGHT_POLL);
          // Upstash get can fail; treat failures as a cache miss.
          const cached = yield* redis
            .get<RedisJsonValue>(cacheKey)
            .pipe(Effect.catch(() => Effect.succeed<RedisJsonValue>(null)));
          const parsed = parseCached(cached);
          if (parsed !== null) return toReturnValue(parsed, config.transform);

          ownsLock = yield* redis
            .set(lockKey, lockToken, { nx: true, px: SINGLE_FLIGHT_LOCK_TTL_MS })
            .pipe(
              Effect.map((result) => Boolean(result)),
              Effect.catch(() => Effect.succeed(false))
            );

          if (ownsLock) {
            return yield* fetchAndCache(params, cacheKey, true).pipe(Effect.ensuring(releaseLock));
          }
        }

        return yield* fetchAndCache(params, cacheKey, false);
      }).pipe(
        Effect.annotateLogs({ category: 'cache', operation: 'getSingleFlight', key: cacheKey }),
        Effect.ensuring(Effect.sync(() => inFlight.delete(cacheKey)))
      )
    );

    inFlight.set(cacheKey, memoized);
    return yield* memoized;
  });

  const deleteCache = Effect.fn('cache.delete')(function* (params: TParams) {
    const appConfig = yield* AppConfig;
    if (!redisActive(appConfig.isProd)) {
      yield* Effect.sleep(DEV_DELAY);
      return;
    }

    const cacheKey = config.getKey(params);
    const redis = yield* RedisClient;
    if (useGenerationGuard) {
      yield* redis
        .incr(redisGenerationKey(cacheKey))
        .pipe(Effect.mapError(toCacheError('incrGeneration', cacheKey)));
    }
    yield* redis.del(cacheKey).pipe(Effect.mapError(toCacheError('delete', cacheKey)));
  });

  const refresh = Effect.fn('cache.refresh')(function* (
    params: TParams,
    { deleteFirst = true }: CacheRefreshOptions = {}
  ) {
    const appConfig = yield* AppConfig;
    if (!redisActive(appConfig.isProd)) {
      yield* Effect.sleep(DEV_DELAY);
      return;
    }

    if (deleteFirst) {
      yield* deleteCache(params);
    }

    const cacheKey = config.getKey(params);
    const genSnapshot = yield* snapshotGeneration(cacheKey);
    const redis = yield* RedisClient;
    const database = yield* Database;
    const ai = yield* AiProvider;
    const background = yield* BackgroundWork;

    const repopulate = Effect.gen(function* () {
      if (genSnapshot.kind === 'unavailable') return;
      const fetched = yield* config
        .fetch(params)
        .pipe(
          Effect.mapError((cause) =>
            cause instanceof CacheError
              ? cause
              : CacheError.make({ operation: 'refreshFetch', key: cacheKey, cause })
          )
        );
      if (shouldCache(fetched)) {
        const setOptions = resolveSetOptions(fetched, ttlSeconds, config.getSetOptions);
        yield* writeWithGenerationSnapshot(
          cacheKey,
          toCacheValue(fetched),
          setOptions,
          genSnapshot
        );
      }
    });

    yield* background.enqueue(() =>
      Effect.runPromise(
        repopulate.pipe(
          Effect.provideService(RedisClient, redis),
          Effect.provideService(Database, database),
          Effect.provideService(AiProvider, ai),
          Effect.provideService(AppConfig, appConfig),
          Effect.provideService(BackgroundWork, background),
          Effect.catch((error) =>
            Effect.logWarning('cache refresh failed', { key: cacheKey, error }).pipe(Effect.asVoid)
          )
        )
      )
    );
  });

  return {
    get,
    delete: deleteCache,
    refresh,
    key: (params) => Effect.succeed(config.getKey(params))
  };
}

/** Await cache delete, then warm cache in background. */
export const invalidateAndRefreshCache = <TParams, TData>(
  cache: CacheItem<TParams, TData>,
  params: TParams
) =>
  Effect.gen(function* () {
    yield* cache
      .delete(params)
      .pipe(
        Effect.catch((error) =>
          Effect.logWarning('cache invalidate failed', { error }).pipe(Effect.asVoid)
        )
      );
    yield* cache.refresh(params, { deleteFirst: false });
  });

/** No-arg cache loaders use an empty params object. */
export type NoCacheParams = Record<string, never>;

export const NO_CACHE_PARAMS =
  // SAFETY: an empty object trivially satisfies the empty-params record
  {} as NoCacheParams;

import { Effect } from 'effect';
import type { ZodType } from 'zod';
import { AppConfig } from '~/effect/config';
import { RedisClient, type RedisJsonValue } from '~/effect/redis';
import { AiProvider } from '~/effect/ai';
import { DatabaseHttp } from '~/effect/database';
import { BadRequestError, CacheError, type AiProviderError } from '~/effect/errors';
import { createCache, warmCache, type CacheItem } from '~/effect/cache';
import { reportSwallowedError } from '~/effect/report';
import { AI_FAILURE_TTL_SECONDS, CACHE_AI_OUTSIDE_PROD } from './ai_cache_options';

export type AiContentParams = { puzzle_id: number };

/** A puzzle's generation inputs plus whatever output is currently stored for it. */
export type StoredAiContent<TInputs> = {
  slug: string;
  inputs: TInputs;
  /** Stored jsonb output (unvalidated) */
  data: unknown;
  /** Input hash the stored output was generated from */
  hash: string | null;
};

type AiContentCacheConfig<TInputs, TData> = {
  /** Redis key for a puzzle's output */
  getKey: (puzzle_id: number) => string;
  /** Pre-Postgres slug-keyed Redis entry; reused once instead of paying for a new run */
  legacyKey: (slug: string) => string;
  schema: ZodType<TData>;
  load: (
    puzzle_id: number
  ) => Effect.Effect<StoredAiContent<TInputs> | undefined, CacheError, DatabaseHttp>;
  inputHash: (inputs: TInputs) => string;
  /** Output has one entry per active word of `inputs` */
  fitsInputs: (data: TData, inputs: TInputs) => boolean;
  generate: (stored: StoredAiContent<TInputs>) => Effect.Effect<TData, AiProviderError, AiProvider>;
  /** Persist the output, but only while the puzzle's inputs still equal `inputs`. */
  save: (
    puzzle_id: number,
    inputs: TInputs,
    data: TData,
    hash: string
  ) => Effect.Effect<void, CacheError, DatabaseHttp>;
};

export type AiContentCache<TData> = CacheItem<AiContentParams, TData> & {
  /** Force a fresh paid generation, persist it and drop the Redis copy. `undefined` if no puzzle. */
  regenerate: (
    puzzle_id: number
  ) => Effect.Effect<
    TData | undefined,
    CacheError,
    RedisClient | AppConfig | DatabaseHttp | AiProvider
  >;
  /**
   * After a save changed the inputs (the stored output is cleared in that transaction): drop the
   * Redis copy and pre-generate in the background.
   */
  invalidateAndWarm: (puzzle_id: number) => ReturnType<typeof warmCache>;
  /**
   * Drop the pre-Postgres slug-keyed entry wherever it may no longer match its slug's puzzle
   * (inputs changed, puzzle deleted, slug freed), so `reuseLegacy` never copies stale output.
   */
  deleteLegacy: (slug: string) => Effect.Effect<void, never, RedisClient | AppConfig>;
};

/**
 * Paid AI output persisted on the puzzle row (Postgres is the source of truth) with Redis as a
 * read cache. A stored output is only served while its hash matches the puzzle's current inputs,
 * so edits and prompt-version bumps invalidate it without extra bookkeeping.
 */
export function createAiContentCache<TInputs, TData>(
  config: AiContentCacheConfig<TInputs, TData>
): AiContentCache<TData> {
  const generateAndSave = (puzzle_id: number, stored: StoredAiContent<TInputs>) =>
    Effect.gen(function* () {
      const data = yield* config.generate(stored).pipe(
        Effect.mapError((cause) =>
          CacheError.make({
            operation: 'aiContentGenerate',
            key: config.getKey(puzzle_id),
            cause
          })
        )
      );
      yield* config.save(puzzle_id, stored.inputs, data, config.inputHash(stored.inputs));
      return data;
    });

  const deleteLegacy = (slug: string) =>
    Effect.gen(function* () {
      const appConfig = yield* AppConfig;
      if (!appConfig.isProd && !CACHE_AI_OUTSIDE_PROD) return;
      const redis = yield* RedisClient;
      const legacyKey = config.legacyKey(slug);
      yield* redis
        .del(legacyKey, `${legacyKey}:gen`, `${legacyKey}:fail`)
        .pipe(Effect.catch(() => Effect.void));
    });

  /** Copy a still-valid slug-keyed Redis value into Postgres so it isn't paid for twice. */
  const reuseLegacy = (puzzle_id: number, stored: StoredAiContent<TInputs>) =>
    Effect.gen(function* () {
      const appConfig = yield* AppConfig;
      if (!appConfig.isProd && !CACHE_AI_OUTSIDE_PROD) return undefined;
      const redis = yield* RedisClient;
      const legacyKey = config.legacyKey(stored.slug);
      const raw = yield* redis
        .get<RedisJsonValue>(legacyKey)
        .pipe(Effect.catch(() => Effect.succeed<RedisJsonValue>(null)));
      if (raw === null) return undefined;
      const parsed = config.schema.safeParse(raw);
      if (!parsed.success || !config.fitsInputs(parsed.data, stored.inputs)) return undefined;
      yield* config.save(puzzle_id, stored.inputs, parsed.data, config.inputHash(stored.inputs));
      yield* deleteLegacy(stored.slug);
      return parsed.data;
    });

  const cache = createCache<AiContentParams, TData>({
    getKey: ({ puzzle_id }) => config.getKey(puzzle_id),
    // Paid generation: don't regenerate on every public request after a failure
    failureTtlSeconds: AI_FAILURE_TTL_SECONDS,
    useGenerationGuard: true,
    useSingleFlight: true,
    cacheOutsideProd: CACHE_AI_OUTSIDE_PROD,
    schema: config.schema,
    fetch: ({ puzzle_id }) =>
      Effect.gen(function* () {
        const stored = yield* config.load(puzzle_id);
        if (!stored) {
          return yield* Effect.fail(
            CacheError.make({
              operation: 'aiContentPuzzle',
              key: config.getKey(puzzle_id),
              cause: BadRequestError.make({ message: `Puzzle not found for id: ${puzzle_id}` })
            })
          );
        }

        if (stored.hash === config.inputHash(stored.inputs)) {
          const parsed = config.schema.safeParse(stored.data);
          if (parsed.success) return parsed.data;
        }

        const legacy = yield* reuseLegacy(puzzle_id, stored);
        if (legacy !== undefined) return legacy;

        return yield* generateAndSave(puzzle_id, stored);
      })
  });

  const regenerate = Effect.fn('ai_content.regenerate')(function* (puzzle_id: number) {
    const stored = yield* config.load(puzzle_id);
    if (!stored) return undefined;
    const data = yield* generateAndSave(puzzle_id, stored);
    // Also clears the failure backoff; the next read refills Redis from Postgres
    yield* cache
      .delete({ puzzle_id })
      .pipe(Effect.catch((error) => reportSwallowedError('ai_content.regenerate')(error)));
    return data;
  });

  const invalidateAndWarm = (puzzle_id: number) =>
    Effect.gen(function* () {
      yield* cache
        .delete({ puzzle_id })
        .pipe(Effect.catch((error) => reportSwallowedError('ai_content.invalidate')(error)));
      yield* warmCache(cache, { puzzle_id });
    });

  return { ...cache, regenerate, invalidateAndWarm, deleteLegacy };
}

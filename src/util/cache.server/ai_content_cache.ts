import { Effect } from 'effect';
import type { ZodType } from 'zod';
import { AppConfig } from '~/effect/config';
import { RedisClient } from '~/effect/redis';
import { AiProvider } from '~/effect/ai';
import { DatabaseHttp } from '~/effect/database';
import { BadRequestError, CacheError, ConflictError, type AiProviderError } from '~/effect/errors';
import { createCache, warmCache, type CacheItem } from '~/effect/cache';
import { reportSwallowedError } from '~/effect/report';
import { AI_FAILURE_TTL_SECONDS, CACHE_AI_OUTSIDE_PROD } from './ai_cache_options';

const AI_REDIS_TTL_SECONDS = 24 * 60 * 60;

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
  schema: ZodType<TData>;
  load: (
    puzzle_id: number
  ) => Effect.Effect<StoredAiContent<TInputs> | undefined, CacheError, DatabaseHttp>;
  inputHash: (inputs: TInputs) => string;
  generate: (stored: StoredAiContent<TInputs>) => Effect.Effect<TData, AiProviderError, AiProvider>;
  /**
   * Persist the output, but only while the puzzle's inputs still equal `inputs` and the stored
   * hash is still `previousHash` (what this generation loaded), so an older run can't overwrite a
   * newer one. Resolves `false` when nothing was written.
   */
  save: (args: {
    puzzle_id: number;
    inputs: TInputs;
    data: TData;
    hash: string;
    previousHash: string | null;
  }) => Effect.Effect<boolean, CacheError, DatabaseHttp>;
};

export type AiContentCache<TData> = CacheItem<AiContentParams, TData> & {
  /**
   * Force a fresh paid generation, persist it and drop the Redis copy. `undefined` if no puzzle;
   * fails with `ConflictError` when the puzzle was edited mid-generation and nothing was saved.
   */
  regenerate: (
    puzzle_id: number
  ) => Effect.Effect<
    TData | undefined,
    CacheError | ConflictError,
    RedisClient | AppConfig | DatabaseHttp | AiProvider
  >;
  /**
   * After a save changed the inputs (the stored output is cleared in that transaction): drop the
   * Redis copy and pre-generate in the background.
   */
  invalidateAndWarm: (puzzle_id: number) => ReturnType<typeof warmCache>;
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
      const saved = yield* config.save({
        puzzle_id,
        inputs: stored.inputs,
        data,
        hash: config.inputHash(stored.inputs),
        previousHash: stored.hash
      });
      // Unsaved output still matches the inputs this caller loaded, so it is safe to return;
      // the guarded Redis write is dropped by the edit's generation bump.
      return { data, saved };
    });

  const cache = createCache<AiContentParams, TData>({
    getKey: ({ puzzle_id }) => config.getKey(puzzle_id),
    // Postgres is the source of truth: a short TTL bounds how long a missed Redis delete can
    // serve outdated output, and a refill is only a DB read
    ttlSeconds: AI_REDIS_TTL_SECONDS,
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

        const { data } = yield* generateAndSave(puzzle_id, stored);
        return data;
      })
  });

  const regenerate = Effect.fn('ai_content.regenerate')(function* (puzzle_id: number) {
    const stored = yield* config.load(puzzle_id);
    if (!stored) return undefined;
    const { data, saved } = yield* generateAndSave(puzzle_id, stored);
    if (!saved) {
      return yield* Effect.fail(
        ConflictError.make({ message: 'Puzzle changed while regenerating; try again' })
      );
    }
    // Also clears the failure backoff; the next read refills Redis from Postgres. Not swallowed:
    // the admin should retry rather than see success while Redis still serves the old output.
    yield* cache.delete({ puzzle_id });
    return data;
  });

  const invalidateAndWarm = (puzzle_id: number) =>
    Effect.gen(function* () {
      yield* cache
        .delete({ puzzle_id })
        .pipe(Effect.catch((error) => reportSwallowedError('ai_content.invalidate')(error)));
      yield* warmCache(cache, { puzzle_id });
    });

  return { ...cache, regenerate, invalidateAndWarm };
}

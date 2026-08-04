import { Effect } from 'effect';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { image_schema, puzzle_schema } from '~/db/db_shared_vals';
import { createCache, type CacheItem, type NoCacheParams } from '~/effect/cache';
import { dbRun } from '~/effect/database';
import { BadRequestError, CacheError } from '~/effect/errors';
import {
  get_puzzle_word_meanings,
  word_meanings_schema,
  type WordMeaningsType
} from '../ai/word_meanings';

type PadavaliPuzzleType = z.infer<typeof puzzle_schema>;
export type { PadavaliPuzzleType };

const current_schedule_schema = z.object({
  id: z.number().int(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  puzzle: puzzle_schema
});

export type PadavaliCurrentScheduleType = z.infer<typeof current_schedule_schema> | undefined;

const next_schedule_schema = z.object({
  id: z.number().int(),
  start_time: z.coerce.date(),
  puzzle: z.object({
    id: z.number().int()
  })
});

export type PadavaliNextScheduleType = z.infer<typeof next_schedule_schema> | undefined;

const listed_puzzle_schema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  image: image_schema.nullable()
});

export type PadavaliListedPuzzlesType = z.infer<typeof listed_puzzle_schema>[];

export type PadavaliPuzzleParams = { slug: string };

const CURRENT_SCHEDULE_KEY = 'padavali:current_schedule';
const NEXT_SCHEDULE_KEY = 'padavali:next_schedule';
const LISTED_PUZZLE_LIST_KEY = 'padavali:listed_puzzle_list';

const wordPuzzleKey = (slug: string) => `padavali:word_puzzle:${slug}`;
const wordMeaningsKey = (slug: string) => `padavali:word_meanings:${slug}`;

const toCacheError = (operation: string, key: string) => (cause: unknown) =>
  CacheError.make({ operation, key, cause });

const parseScheduleSentinel =
  <T>(schema: z.ZodType<T>) =>
  (raw: unknown): T | undefined | null => {
    if (raw === 'undefined') return undefined;
    if (typeof raw === 'object' && raw !== null) return schema.parse(raw);
    return null;
  };

const load_current_schedule: CacheItem<NoCacheParams, PadavaliCurrentScheduleType> = createCache({
  getKey: () => CURRENT_SCHEDULE_KEY,
  schema: current_schedule_schema,
  toCacheValue: (data) => data ?? 'undefined',
  fromCacheValue: parseScheduleSentinel(current_schedule_schema),
  getSetOptions: (data) =>
    data
      ? {
          exat: Math.floor(data.end_time.getTime() / 1000 - 2)
        }
      : undefined,
  fetch: () => {
    const currentTime = new Date();
    return dbRun('padavali.current_schedule', (client) =>
      client.query.padavali_schedules.findFirst({
        columns: {
          id: true,
          start_time: true,
          end_time: true
        },
        where: (tbl, { and, lte, gte }) =>
          and(lte(tbl.start_time, currentTime), gte(tbl.end_time, currentTime)),
        with: {
          puzzle: {
            with: {
              attachments: {
                columns: {
                  id: true,
                  title: true,
                  type: true,
                  url: true,
                  order_index: true
                },
                orderBy: (tbl, { asc }) => asc(tbl.order_index)
              },
              image: {
                columns: {
                  id: true,
                  s3_key: true,
                  width: true,
                  height: true
                }
              }
            }
          }
        }
      })
    ).pipe(Effect.mapError(toCacheError('fetchCurrentSchedule', CURRENT_SCHEDULE_KEY)));
  }
});

const load_next_schedule: CacheItem<NoCacheParams, PadavaliNextScheduleType> = createCache({
  getKey: () => NEXT_SCHEDULE_KEY,
  schema: next_schedule_schema,
  toCacheValue: (data) => data ?? 'undefined',
  fromCacheValue: parseScheduleSentinel(next_schedule_schema),
  getSetOptions: (data) =>
    data ? { exat: Math.floor(data.start_time.getTime() / 1000) } : undefined,
  fetch: () => {
    const currentTime = new Date();
    return dbRun('padavali.next_schedule', (client) =>
      client.query.padavali_schedules.findFirst({
        columns: {
          id: true,
          start_time: true
        },
        where: (tbl, { gt }) => gt(tbl.start_time, currentTime),
        orderBy: (tbl, { asc }) => asc(tbl.start_time),
        with: {
          puzzle: {
            columns: {
              id: true
            }
          }
        }
      })
    ).pipe(Effect.mapError(toCacheError('fetchNextSchedule', NEXT_SCHEDULE_KEY)));
  }
});

const load_listed_puzzle_list: CacheItem<NoCacheParams, PadavaliListedPuzzlesType> = createCache({
  getKey: () => LISTED_PUZZLE_LIST_KEY,
  schema: listed_puzzle_schema.array(),
  fetch: () =>
    dbRun('padavali.listed_puzzle_list', (client) =>
      client.query.padavali_puzzles.findMany({
        columns: {
          id: true,
          slug: true,
          title: true,
          description: true
        },
        with: {
          image: {
            columns: {
              id: true,
              s3_key: true,
              width: true,
              height: true
            }
          }
        },
        where: ({ listed }, { eq }) => eq(listed, true),
        orderBy: ({ created_at, last_listed_at }, { desc }) => [
          desc(sql`COALESCE(${last_listed_at}, '1970-01-01'::timestamp with time zone)`),
          desc(created_at)
        ]
      })
    ).pipe(Effect.mapError(toCacheError('fetchListedPuzzleList', LISTED_PUZZLE_LIST_KEY)))
});

const load_word_puzzle: CacheItem<PadavaliPuzzleParams, PadavaliPuzzleType | undefined> =
  createCache<PadavaliPuzzleParams, PadavaliPuzzleType | undefined>({
    getKey: ({ slug }) => wordPuzzleKey(slug),
    schema: puzzle_schema,
    shouldCache: (data) => data !== undefined,
    fetch: ({ slug }) =>
      dbRun('padavali.word_puzzle', (client) =>
        client.query.padavali_puzzles.findFirst({
          where: (tbl, { eq }) => eq(tbl.slug, slug),
          with: {
            attachments: {
              columns: {
                id: true,
                title: true,
                type: true,
                url: true,
                order_index: true
              },
              orderBy: (tbl, { asc }) => asc(tbl.order_index)
            },
            image: {
              columns: {
                id: true,
                s3_key: true,
                width: true,
                height: true
              }
            }
          }
        })
      ).pipe(Effect.mapError(toCacheError('fetchWordPuzzle', wordPuzzleKey(slug))))
  });

const load_word_meanings: CacheItem<PadavaliPuzzleParams, WordMeaningsType> = createCache({
  getKey: ({ slug }) => wordMeaningsKey(slug),
  ttlSeconds: Infinity,
  useGenerationGuard: true,
  useSingleFlight: true,
  schema: word_meanings_schema,
  fetch: ({ slug }) =>
    Effect.gen(function* () {
      const key = wordMeaningsKey(slug);
      const puzzle = yield* load_word_puzzle.get({ slug });

      if (!puzzle) {
        return yield* Effect.fail(
          CacheError.make({
            operation: 'fetchWordMeaningsPuzzle',
            key,
            cause: BadRequestError.make({
              message: `Puzzle not found for slug: ${slug}`
            })
          })
        );
      }

      return yield* get_puzzle_word_meanings(puzzle).pipe(
        Effect.mapError((cause) =>
          CacheError.make({
            operation: 'fetchWordMeaningsAi',
            key,
            cause
          })
        )
      );
    })
});

export type PadavaliCacheLoaders = {
  current_schedule: CacheItem<NoCacheParams, PadavaliCurrentScheduleType>;
  next_schedule: CacheItem<NoCacheParams, PadavaliNextScheduleType>;
  listed_puzzle_list: CacheItem<NoCacheParams, PadavaliListedPuzzlesType>;
  word_puzzle: CacheItem<PadavaliPuzzleParams, PadavaliPuzzleType | undefined>;
  word_meanings: CacheItem<PadavaliPuzzleParams, WordMeaningsType>;
};

export const padavali_cache_loaders: PadavaliCacheLoaders = {
  current_schedule: load_current_schedule,
  next_schedule: load_next_schedule,
  listed_puzzle_list: load_listed_puzzle_list,
  word_puzzle: load_word_puzzle,
  word_meanings: load_word_meanings
};

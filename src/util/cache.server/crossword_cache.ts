import { Effect } from 'effect';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { attachment_schema, image_schema } from '~/db/db_shared_vals';
import { CrossWordPuzzleWordSchema, CrossordPuzzleGridCellSchema } from '~/db/schema_zod';
import { createCache, type CacheItem, type NoCacheParams } from '~/effect/cache';
import { dbRun } from '~/effect/database';
import { BadRequestError, CacheError } from '~/effect/errors';
import {
  get_crossword_more_hints,
  more_hints_schema,
  type MoreHintsType
} from '~/util/ai/more_hints';

const crossword_puzzle_schema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable().optional(),
  word_list: CrossWordPuzzleWordSchema.array(),
  grid_data: CrossordPuzzleGridCellSchema.array().array(),
  grid_dimensions: z.tuple([z.number().int(), z.number().int()]),
  listed: z.boolean(),
  description: z.string(),
  attachments: z.array(attachment_schema),
  image: image_schema.nullable()
});

export type CrosswordPuzzleType = z.infer<typeof crossword_puzzle_schema>;

const current_schedule_schema = z.object({
  id: z.number().int(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  puzzle: crossword_puzzle_schema
});

export type CrosswordCurrentScheduleType = z.infer<typeof current_schedule_schema> | undefined;

const next_schedule_schema = z.object({
  id: z.number().int(),
  start_time: z.coerce.date(),
  puzzle: z.object({
    id: z.number().int()
  })
});

export type CrosswordNextScheduleType = z.infer<typeof next_schedule_schema> | undefined;

const listed_puzzle_schema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  image: image_schema.nullable()
});

export type CrosswordListedPuzzlesType = z.infer<typeof listed_puzzle_schema>[];

export type CrosswordPuzzleParams = { slug: string };

const CURRENT_SCHEDULE_KEY = 'crossword:current_schedule';
const NEXT_SCHEDULE_KEY = 'crossword:next_schedule';
const LISTED_PUZZLE_LIST_KEY = 'crossword:listed_puzzle_list';

const wordPuzzleKey = (slug: string) => `crossword:word_puzzle:${slug}`;
const moreHintsKey = (slug: string) => `crossword:puzzle_more_hints:${slug}`;

const toCacheError = (operation: string, key: string) => (cause: unknown) =>
  CacheError.make({ operation, key, cause });

const parseScheduleSentinel =
  <T>(schema: z.ZodType<T>) =>
  (raw: unknown): T | undefined | null => {
    if (raw === 'undefined') return undefined;
    if (typeof raw === 'object' && raw !== null) {
      const parsed = schema.safeParse(raw);
      return parsed.success ? parsed.data : null;
    }
    return null;
  };

const load_current_schedule: CacheItem<NoCacheParams, CrosswordCurrentScheduleType> = createCache({
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
    return dbRun('crossword.current_schedule', (client) =>
      client.query.crossword_schedules.findFirst({
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

const load_next_schedule: CacheItem<NoCacheParams, CrosswordNextScheduleType> = createCache({
  getKey: () => NEXT_SCHEDULE_KEY,
  schema: next_schedule_schema,
  toCacheValue: (data) => data ?? 'undefined',
  fromCacheValue: parseScheduleSentinel(next_schedule_schema),
  getSetOptions: (data) =>
    data ? { exat: Math.floor(data.start_time.getTime() / 1000) } : undefined,
  fetch: () => {
    const currentTime = new Date();
    return dbRun('crossword.next_schedule', (client) =>
      client.query.crossword_schedules.findFirst({
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

const load_listed_puzzle_list: CacheItem<NoCacheParams, CrosswordListedPuzzlesType> = createCache({
  getKey: () => LISTED_PUZZLE_LIST_KEY,
  schema: listed_puzzle_schema.array(),
  fetch: () =>
    dbRun('crossword.listed_puzzle_list', (client) =>
      client.query.crossword_puzzles.findMany({
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

const load_word_puzzle: CacheItem<CrosswordPuzzleParams, CrosswordPuzzleType | undefined> =
  createCache<CrosswordPuzzleParams, CrosswordPuzzleType | undefined>({
    getKey: ({ slug }) => wordPuzzleKey(slug),
    schema: crossword_puzzle_schema,
    shouldCache: (data) => data !== undefined,
    fetch: ({ slug }) =>
      dbRun('crossword.word_puzzle', (client) =>
        client.query.crossword_puzzles.findFirst({
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

const load_more_hints: CacheItem<CrosswordPuzzleParams, MoreHintsType> = createCache({
  getKey: ({ slug }) => moreHintsKey(slug),
  ttlSeconds: Infinity,
  useGenerationGuard: true,
  useSingleFlight: true,
  schema: more_hints_schema,
  fetch: ({ slug }) =>
    Effect.gen(function* () {
      const key = moreHintsKey(slug);
      const puzzle = yield* load_word_puzzle.get({ slug });

      if (!puzzle) {
        return yield* Effect.fail(
          CacheError.make({
            operation: 'fetchMoreHintsPuzzle',
            key,
            cause: BadRequestError.make({
              message: `Crossword puzzle not found for slug: ${slug}`
            })
          })
        );
      }

      return yield* get_crossword_more_hints(puzzle).pipe(
        Effect.mapError((cause) =>
          CacheError.make({
            operation: 'fetchMoreHintsAi',
            key,
            cause
          })
        )
      );
    })
});

export type CrosswordCacheLoaders = {
  current_schedule: CacheItem<NoCacheParams, CrosswordCurrentScheduleType>;
  next_schedule: CacheItem<NoCacheParams, CrosswordNextScheduleType>;
  listed_puzzle_list: CacheItem<NoCacheParams, CrosswordListedPuzzlesType>;
  word_puzzle: CacheItem<CrosswordPuzzleParams, CrosswordPuzzleType | undefined>;
  more_hints: CacheItem<CrosswordPuzzleParams, MoreHintsType>;
};

export const crossword_cache_loaders: CrosswordCacheLoaders = {
  current_schedule: load_current_schedule,
  next_schedule: load_next_schedule,
  listed_puzzle_list: load_listed_puzzle_list,
  word_puzzle: load_word_puzzle,
  more_hints: load_more_hints
};

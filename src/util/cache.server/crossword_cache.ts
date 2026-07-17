import { db } from '~/db/db';
import { REDIS_CACHE_KEYS } from '~/db/redis';
import { image_schema, attachment_schema } from '~/db/db_shared_vals';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { createCachedLoader, type CachedLoader, type NoCacheParams } from './create_cached_loader';
import {
  CrossWordPuzzleWordSchema,
  CrossordPuzzleGridCellSchema
} from '~/db/schema_zod';

export { NO_CACHE_PARAMS } from './create_cached_loader';

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
  description: z.string().nullable(),
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
  description: z.string().nullable(),
  image: image_schema.nullable()
});

export type CrosswordListedPuzzlesType = z.infer<typeof listed_puzzle_schema>[];

const schedule_sentinel_from_cache = <T>(raw: unknown): T | null => {
  if (raw === 'undefined') return undefined as T;
  if (typeof raw === 'object' && raw) return raw as T;
  return null;
};

const load_current_schedule = createCachedLoader<NoCacheParams, CrosswordCurrentScheduleType>({
  getKey: () => REDIS_CACHE_KEYS.crossword_current_schedule(),
  fetch: async () => {
    const currentTime = new Date();
    const data = await db.query.crossword_schedules.findFirst({
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
    });
    return data satisfies CrosswordCurrentScheduleType;
  },
  schema: current_schedule_schema,
  toCacheValue: (data) => data ?? 'undefined',
  fromCacheValue: (raw) => {
    const parsed = schedule_sentinel_from_cache<CrosswordCurrentScheduleType>(raw);
    if (parsed === null) return null;
    if (parsed === undefined) return undefined;
    return current_schedule_schema.parse(parsed);
  },
  getSetOptions: (data) =>
    data
      ? {
          exat: Math.floor(data.end_time.getTime() / 1000 - 2)
        }
      : undefined
});

const load_next_schedule = createCachedLoader<NoCacheParams, CrosswordNextScheduleType>({
  getKey: () => REDIS_CACHE_KEYS.crossword_next_schedule(),
  fetch: async () => {
    const currentTime = new Date();
    const data = await db.query.crossword_schedules.findFirst({
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
    });
    return data satisfies CrosswordNextScheduleType;
  },
  schema: next_schedule_schema,
  toCacheValue: (data) => data ?? 'undefined',
  fromCacheValue: (raw) => {
    const parsed = schedule_sentinel_from_cache<CrosswordNextScheduleType>(raw);
    if (parsed === null) return null;
    if (parsed === undefined) return undefined;
    return next_schedule_schema.parse(parsed);
  },
  getSetOptions: (data) =>
    data ? { exat: Math.floor(data.start_time.getTime() / 1000) } : undefined
});

const load_listed_puzzle_list = createCachedLoader<NoCacheParams, CrosswordListedPuzzlesType>({
  getKey: () => REDIS_CACHE_KEYS.crossword_listed_puzzle_list(),
  schema: listed_puzzle_schema.array(),
  fetch: async () => {
    const data = await db.query.crossword_puzzles.findMany({
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
    });
    return data satisfies CrosswordListedPuzzlesType;
  }
});

export type CrosswordPuzzleParams = { slug: string };

const load_word_puzzle = createCachedLoader<
  CrosswordPuzzleParams,
  CrosswordPuzzleType | undefined
>({
  getKey: ({ slug }) => REDIS_CACHE_KEYS.crossword_word_puzzle(slug),
  schema: crossword_puzzle_schema,
  shouldCache: (data): data is CrosswordPuzzleType => data !== undefined,
  fetch: async ({ slug }) => {
    const data = await db.query.crossword_puzzles.findFirst({
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
    });
    return data satisfies CrosswordPuzzleType | undefined;
  }
});

export type CrosswordCacheLoaders = {
  current_schedule: CachedLoader<NoCacheParams, CrosswordCurrentScheduleType>;
  next_schedule: CachedLoader<NoCacheParams, CrosswordNextScheduleType>;
  listed_puzzle_list: CachedLoader<NoCacheParams, CrosswordListedPuzzlesType>;
  word_puzzle: CachedLoader<CrosswordPuzzleParams, CrosswordPuzzleType | undefined>;
};

export const crossword_cache_loaders: CrosswordCacheLoaders = {
  current_schedule: load_current_schedule,
  next_schedule: load_next_schedule,
  listed_puzzle_list: load_listed_puzzle_list,
  word_puzzle: load_word_puzzle
};

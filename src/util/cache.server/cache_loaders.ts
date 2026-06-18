import { db } from '~/db/db';
import { REDIS_CACHE_KEYS } from '~/db/redis';
import { puzzle_schema } from '~/db/db_shared_vals';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import {
  createCachedLoader,
  type CachedLoader,
  type NoCacheParams,
  NO_CACHE_PARAMS
} from './create_cached_loader';

export { NO_CACHE_PARAMS } from './create_cached_loader';

type PuzzleType = z.infer<typeof puzzle_schema>;
export type { PuzzleType };

const current_schedule_schema = z.object({
  id: z.number().int(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  puzzle: puzzle_schema
});

export type CurrentScheduleType = z.infer<typeof current_schedule_schema> | undefined;

const next_schedule_schema = z.object({
  id: z.number().int(),
  start_time: z.coerce.date(),
  puzzle: z.object({
    id: z.number().int()
  })
});

export type NextScheduleType = z.infer<typeof next_schedule_schema> | undefined;

const archived_puzzle_schema = z.object({
  id: z.number().int(),
  uuid: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable()
});

export type ArchivedPuzzlesType = z.infer<typeof archived_puzzle_schema>[];

const schedule_sentinel_from_cache = <T>(raw: unknown): T | null => {
  if (raw === 'undefined') return undefined as T;
  if (typeof raw === 'object' && raw) return raw as T;
  return null;
};

const load_current_schedule = createCachedLoader<NoCacheParams, CurrentScheduleType>({
  getKey: () => REDIS_CACHE_KEYS.current_schedule(),
  fetch: async () => {
    const currentTime = new Date();
    const data = await db.query.puzzle_game_schedules.findFirst({
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
            }
          }
        }
      }
    });
    return data satisfies CurrentScheduleType;
  },
  schema: current_schedule_schema,
  toCacheValue: (data) => data ?? 'undefined',
  fromCacheValue: (raw) => {
    const parsed = schedule_sentinel_from_cache<CurrentScheduleType>(raw);
    if (parsed === null) return null;
    if (parsed === undefined) return undefined;
    return current_schedule_schema.parse(parsed);
  },
  getSetOptions: (data) =>
    data ? { exat: Math.floor(data.end_time.getTime() / 1000) } : undefined
});

const load_next_schedule = createCachedLoader<NoCacheParams, NextScheduleType>({
  getKey: () => REDIS_CACHE_KEYS.next_schedule(),
  fetch: async () => {
    const currentTime = new Date();
    const data = await db.query.puzzle_game_schedules.findFirst({
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
    return data satisfies NextScheduleType;
  },
  schema: next_schedule_schema,
  toCacheValue: (data) => data ?? 'undefined',
  fromCacheValue: (raw) => {
    const parsed = schedule_sentinel_from_cache<NextScheduleType>(raw);
    if (parsed === null) return null;
    if (parsed === undefined) return undefined;
    return next_schedule_schema.parse(parsed);
  },
  getSetOptions: (data) =>
    data ? { exat: Math.floor(data.start_time.getTime() / 1000) } : undefined
});

const load_archived_puzzle_list = createCachedLoader<NoCacheParams, ArchivedPuzzlesType>({
  getKey: () => REDIS_CACHE_KEYS.archived_puzzle_list(),
  schema: archived_puzzle_schema.array(),
  fetch: async () => {
    const data = await db.query.word_puzzles.findMany({
      columns: {
        id: true,
        uuid: true,
        title: true,
        description: true
      },
      where: ({ archived }, { eq }) => eq(archived, true),
      orderBy: ({ created_at, last_archived_at }, { desc }) => [
        desc(sql`COALESCE(${last_archived_at}, '1970-01-01'::timestamp with time zone)`),
        desc(created_at)
      ]
    });
    return data satisfies ArchivedPuzzlesType;
  }
});

type WordPuzzleParams = { id: number; uuid: string };

const load_word_puzzle = createCachedLoader<WordPuzzleParams, PuzzleType | undefined>({
  getKey: ({ id, uuid }) => REDIS_CACHE_KEYS.word_puzzle(id, uuid),
  schema: puzzle_schema,
  shouldCache: (data): data is PuzzleType => data !== undefined,
  fetch: async ({ id, uuid }) => {
    const data = await db.query.word_puzzles.findFirst({
      where: (tbl, { eq, and }) => and(eq(tbl.id, id), eq(tbl.uuid, uuid)),
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
        }
      }
    });
    return data satisfies PuzzleType | undefined;
  }
});

/** Await cache delete, then warm cache in background (prod only, via waitUntil). */
export const invalidate_and_refresh_cached = async <TParams, TData>(
  loader: CachedLoader<TParams, TData>,
  params: TParams
) => {
  await loader.delete(params);
  void loader.refresh(params, { deleteFirst: false });
};

export type CacheLoaderRegistry = {
  current_schedule: CachedLoader<NoCacheParams, CurrentScheduleType>;
  next_schedule: CachedLoader<NoCacheParams, NextScheduleType>;
  archived_puzzle_list: CachedLoader<NoCacheParams, ArchivedPuzzlesType>;
  word_puzzle: CachedLoader<WordPuzzleParams, PuzzleType | undefined>;
};

export const CACHE = {
  current_schedule: load_current_schedule,
  next_schedule: load_next_schedule,
  archived_puzzle_list: load_archived_puzzle_list,
  word_puzzle: load_word_puzzle
} satisfies CacheLoaderRegistry;

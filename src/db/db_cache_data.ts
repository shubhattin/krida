import ms from 'ms';
import { db } from '~/db/db';
import { redis, REDIS_CACHE_KEYS } from '~/db/redis';
import { puzzle_schema } from './db_shared_vals';
import { z } from 'zod';

type PuzzleType = z.infer<typeof puzzle_schema>;

export type CurrentScheduleType =
  | {
      id: number;
      start_time: Date;
      end_time: Date;
      puzzle: PuzzleType;
    }
  | undefined;

export const get_current_schedule = async () => {
  const cache = await redis.get<CurrentScheduleType | string>(REDIS_CACHE_KEYS.current_schedule());
  if (cache) {
    if (cache === 'undefined') return undefined;
    else if (typeof cache === 'object' && cache) {
      return {
        ...cache,
        start_time: new Date(cache.start_time),
        end_time: new Date(cache.end_time),
        puzzle: {
          ...cache.puzzle,
          created_at: new Date(cache.puzzle.created_at),
          updated_at: cache.puzzle.updated_at ? new Date(cache.puzzle.updated_at) : null
        }
      } satisfies CurrentScheduleType;
    }
  }

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

  // setting cache
  await redis.set(
    REDIS_CACHE_KEYS.current_schedule(),
    data ?? 'undefined',
    data && {
      exat: data.end_time.getTime() / 1000
    }
  );

  return data satisfies CurrentScheduleType;
};

type NextScheduleType =
  | {
      id: number;
      start_time: Date;
      puzzle: {
        id: number;
      };
    }
  | undefined;

export const get_next_schedule = async () => {
  const cache = await redis.get<NextScheduleType | string>(REDIS_CACHE_KEYS.next_schedule());
  if (cache) {
    if (cache === 'undefined') return undefined;
    else if (typeof cache === 'object' && cache) {
      return {
        ...cache,
        start_time: new Date(cache.start_time)
      } satisfies NextScheduleType;
    }
  }
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

  // setting cache
  await redis.set(
    REDIS_CACHE_KEYS.next_schedule(),
    data ?? 'undefined',
    data && {
      exat: data.start_time.getTime() / 1000
    }
  );

  return data satisfies NextScheduleType;
};

type ArchivedPuzzlesType = {
  id: number;
  uuid: string;
  title: string;
}[];

export const get_archived_puzzles = async () => {
  const cache = await redis.get<ArchivedPuzzlesType>(REDIS_CACHE_KEYS.archived_puzzle_list());
  if (cache) {
    return cache;
  }
  const data = await db.query.word_puzzles.findMany({
    columns: {
      id: true,
      uuid: true,
      title: true
    },
    where: ({ archived }, { eq }) => eq(archived, true),
    orderBy: ({ created_at }, { desc }) => desc(created_at)
  });

  // setting cache
  await redis.set(REDIS_CACHE_KEYS.archived_puzzle_list(), data, {
    ex: ms('20days') / 1000
  });

  return data satisfies ArchivedPuzzlesType;
};

export const get_word_puzzle = async (id: number, uuid: string) => {
  const cache = await redis.get<PuzzleType>(REDIS_CACHE_KEYS.word_puzzle(id, uuid));
  if (cache) {
    return {
      ...cache,
      created_at: new Date(cache.created_at),
      updated_at: cache.updated_at ? new Date(cache.updated_at) : null
    } satisfies PuzzleType;
  }

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
  if (data) {
    await redis.set(REDIS_CACHE_KEYS.word_puzzle(id, uuid), data, {
      ex: ms('20days') / 1000
    });
  }
  return data satisfies PuzzleType | undefined;
};

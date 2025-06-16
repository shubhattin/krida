import { db } from '~/db/db';
import { redis, REDIS_CACHE_KEYS } from '~/db/redis';

type CurrentScheduleType =
  | {
      id: number;
      start_time: Date;
      end_time: Date;
      puzzle: {
        id: number;
        uuid: string;
        title: string;
        description: string | null;
        created_at: Date;
        updated_at: Date | null;
        word_list: string[];
        grid_data: string[][];
        grid_dimensions: [number, number];
        archived: boolean;
      };
    }
  | undefined;

export const get_current_schedule = async () => {
  const cache = await redis.get<CurrentScheduleType>(REDIS_CACHE_KEYS.current_schedule());
  if (cache) {
    return cache;
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
      puzzle: true
    }
  });

  // setting cache
  await redis.set(REDIS_CACHE_KEYS.current_schedule(), data ?? 'undefined');

  return data satisfies CurrentScheduleType;
};

type NextScheduleType =
  | {
      id: number;
      start_time: Date;
      puzzle: {
        id: number;
        title: string;
      };
    }
  | undefined;

export const get_next_schedule = async () => {
  const cache = await redis.get<NextScheduleType>(REDIS_CACHE_KEYS.next_schedule());
  if (cache) {
    return cache;
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
          id: true,
          title: true
        }
      }
    }
  });

  // setting cache
  await redis.set(REDIS_CACHE_KEYS.next_schedule(), data ?? 'undefined');

  return data satisfies NextScheduleType;
};

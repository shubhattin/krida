import ms from 'ms';
import { db } from '~/db/db';
import { redis, REDIS_CACHE_KEYS } from '~/db/redis';

type PuzzleType = {
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
type CurrentScheduleType =
  | {
      id: number;
      start_time: Date;
      end_time: Date;
      puzzle: PuzzleType;
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
  const cache = await redis.get<PuzzleType | undefined>(REDIS_CACHE_KEYS.word_puzzle(id, uuid));
  if (cache) {
    return cache;
  }

  const data = await db.query.word_puzzles.findFirst({
    where: (tbl, { eq, and }) => and(eq(tbl.id, id), eq(tbl.uuid, uuid))
  });
  if (data) {
    await redis.set(REDIS_CACHE_KEYS.word_puzzle(id, uuid), data, {
      ex: ms('20days') / 1000
    });
  }
  return data satisfies PuzzleType | undefined;
};

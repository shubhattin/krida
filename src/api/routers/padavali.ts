import { z } from 'zod';
import { protectedAdminProcedure, publicProcedure, t } from '../trpc_init';
import { db } from '~/db/db';
import { word_puzzles } from '~/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { padavali_stats_router } from './padavali_stats';
import { redis, REDIS_CACHE_KEYS } from '~/db/redis';
import { get_word_puzzle, type CurrentScheduleType } from '~/db/db_cache_data';

const schema = z.object({
  id: z.number().int(),
  uuid: z.string().uuid(),
  title: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable(),
  word_list: z.string().min(2).array(),
  grid_data: z.string().min(1).array().array(),
  grid_dimensions: z.tuple([z.number().int(), z.number().int()]),
  archived: z.boolean(),
  description: z.string().nullable()
});

const puzzle_in_current_schedule = async (id: number, uuid: string) => {
  const cache = await redis.get<CurrentScheduleType | string>(REDIS_CACHE_KEYS.current_schedule());
  if (!cache || cache === 'undefined') return false;
  if (typeof cache === 'object') {
    return cache.puzzle.id === id && cache.puzzle.uuid === uuid && cache.puzzle.archived === false;
  }
  return false;
};

const update_puzzle_route = protectedAdminProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      puzzle_uuid: z.string().uuid(),
      puzzle_data: schema.pick({
        title: true,
        word_list: true,
        grid_data: true,
        archived: true,
        description: true
      })
    })
  )
  .mutation(async ({ input: { puzzle_id, puzzle_data, puzzle_uuid } }) => {
    revalidatePath('/padavali/list');
    const prev_archived = !puzzle_data.archived
      ? (await db.query.word_puzzles.findFirst({
          columns: {
            archived: true
          },
          where: (tbl, { eq }) => eq(tbl.id, puzzle_id)
        }))!.archived
      : null;

    await Promise.allSettled([
      db
        .update(word_puzzles)
        .set(puzzle_data)
        .where(and(eq(word_puzzles.id, puzzle_id), eq(word_puzzles.uuid, puzzle_uuid))),
      (puzzle_data.archived || prev_archived !== puzzle_data.archived) &&
        redis.del(REDIS_CACHE_KEYS.archived_puzzle_list()),
      redis.del(REDIS_CACHE_KEYS.word_puzzle(puzzle_id, puzzle_uuid)),
      (await puzzle_in_current_schedule(puzzle_id, puzzle_uuid)) &&
        redis.del(REDIS_CACHE_KEYS.current_schedule())
    ]);
    return {
      success: true
    };
  });

const add_puzzle_route = protectedAdminProcedure
  .input(
    schema.omit({
      id: true,
      uuid: true,
      created_at: true,
      updated_at: true
    })
  )
  .mutation(async ({ input }) => {
    revalidatePath('/padavali/list');
    const [info] = await Promise.all([
      db.insert(word_puzzles).values(input).returning(),
      // only invalidate list when puzzle is archived
      input.archived && redis.del(REDIS_CACHE_KEYS.archived_puzzle_list())
    ]);
    return {
      id: info[0].id,
      uuid: info[0].uuid
    };
  });

const delete_puzzle_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int(), uuid: z.string().uuid() }))
  .mutation(async ({ input: { id, uuid } }) => {
    revalidatePath('/padavali/list');
    const { archived } = (await db.query.word_puzzles.findFirst({
      columns: {
        archived: true
      },
      where: (tbl, { eq }) => eq(tbl.id, id)
    }))!;

    await Promise.allSettled([
      db.delete(word_puzzles).where(eq(word_puzzles.id, id)),
      // only invalidate list when puzzle is archived
      archived && redis.del(REDIS_CACHE_KEYS.archived_puzzle_list()),
      redis.del(REDIS_CACHE_KEYS.word_puzzle(id, uuid)),
      (await puzzle_in_current_schedule(id, uuid)) && redis.del(REDIS_CACHE_KEYS.current_schedule())
    ]);
    return {
      success: true
    };
  });

const get_puzzle_data_route = publicProcedure
  .input(z.object({ id: z.number().int(), uuid: z.string().uuid() }))
  .query(async ({ input: { id, uuid } }) => {
    const puzzle = await get_word_puzzle(id, uuid);
    return puzzle!;
  });

export const padavali_router = t.router({
  update_puzzle: update_puzzle_route,
  add_puzzle: add_puzzle_route,
  delete_puzzle: delete_puzzle_route,
  stats: padavali_stats_router,
  get_puzzle_data: get_puzzle_data_route
});

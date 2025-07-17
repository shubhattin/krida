import { protectedAdminProcedure, t } from '~/api/trpc_init';
import { z } from 'zod';
import { db } from '~/db/db';
import { puzzle_game_schedules } from '~/db/schema';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { delay } from '~/tools/delay';
import { redis, REDIS_CACHE_KEYS } from '~/db/redis';
import { publishScheduleArchivalQueue } from '~/lib/qstash';
import { generateRandomAlphanumeric } from '~/tools/kry';

const add_puzzle_schedule_route = protectedAdminProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      start_time: z.coerce.date(),
      end_time: z.coerce.date()
    })
  )
  .output(
    z.discriminatedUnion('success', [
      z.object({
        success: z.literal(true),
        schedule_id: z.number().int()
      }),
      z.object({
        success: z.literal(false),
        error_code: z.enum(['already_exists_in_time_range'])
      })
    ])
  )
  .mutation(async ({ input }) => {
    const { puzzle_id, start_time, end_time } = input;
    const existing_schedule = await db.query.puzzle_game_schedules.findFirst({
      columns: {
        id: true
      },
      where: (table, { and, gte, lte }) =>
        and(
          // Existing starts before or when New ends
          lte(table.start_time, end_time),
          // Existing ends after or when New starts
          gte(table.end_time, start_time)
        )
    });
    if (existing_schedule) {
      return { success: false, error_code: 'already_exists_in_time_range' };
    }

    revalidatePath('/padavali/schedules');
    const archival_verify_key = generateRandomAlphanumeric(32);
    const schedule_pr = db
      .insert(puzzle_game_schedules)
      .values({
        puzzle_id,
        start_time,
        end_time,
        archival_verify_key
      })
      .returning();

    const [schedule] = await Promise.all([
      schedule_pr,
      // invalidate cache
      redis.del(REDIS_CACHE_KEYS.current_schedule()),
      redis.del(REDIS_CACHE_KEYS.next_schedule())
    ]);

    await publishScheduleArchivalQueue(
      {
        puzzle_id,
        schedule_id: schedule[0].id,
        archival_verify_key
      },
      (schedule[0].end_time.getTime() - new Date().getTime()) / 1000 - 1 // delay
    );

    return {
      success: true,
      schedule_id: schedule[0].id
    };
  });

const delete_puzzle_schedule_route = protectedAdminProcedure
  .input(z.object({ schedule_id: z.number().int() }))
  .mutation(async ({ input: { schedule_id } }) => {
    revalidatePath('/padavali/schedules');

    await Promise.allSettled([
      db.delete(puzzle_game_schedules).where(eq(puzzle_game_schedules.id, schedule_id)),
      // invalidate cache
      redis.del(REDIS_CACHE_KEYS.current_schedule()),
      redis.del(REDIS_CACHE_KEYS.next_schedule())
    ]);

    return { success: true };
  });

const update_puzzle_schedule_route = protectedAdminProcedure
  .input(
    z.object({
      schedule_id: z.number().int(),
      puzzle_id: z.number().int(),
      start_time: z.coerce.date(),
      end_time: z.coerce.date()
    })
  )
  .mutation(async ({ input: { schedule_id, puzzle_id, start_time, end_time } }) => {
    revalidatePath('/padavali/schedules');

    const archival_verify_key = generateRandomAlphanumeric(32);
    await Promise.allSettled([
      db
        .update(puzzle_game_schedules)
        .set({ start_time, end_time, archival_verify_key })
        .where(
          and(
            eq(puzzle_game_schedules.id, schedule_id),
            eq(puzzle_game_schedules.puzzle_id, puzzle_id)
          )
        ),
      // invalidate cache
      redis.del(REDIS_CACHE_KEYS.current_schedule()),
      redis.del(REDIS_CACHE_KEYS.next_schedule()),
      publishScheduleArchivalQueue(
        {
          puzzle_id,
          schedule_id,
          archival_verify_key
        },
        (end_time.getTime() - new Date().getTime()) / 1000 - 1 // delay
      )
    ]);

    return { success: true };
  });

const get_past_schedules_route = protectedAdminProcedure.query(async () => {
  await delay(500);
  const current_time = new Date();
  const past_schedules = await db.query.puzzle_game_schedules.findMany({
    columns: {
      id: true,
      start_time: true,
      end_time: true,
      created_at: true,
      puzzle_id: true
    },
    with: {
      puzzle: {
        columns: {
          title: true
        }
      }
    },
    orderBy: (schedules, { desc }) => [desc(schedules.created_at)],
    where: (schedules, { lt }) => lt(schedules.end_time, current_time)
  });

  return past_schedules;
});

export const schedules_router = t.router({
  add_puzzle_schedule: add_puzzle_schedule_route,
  delete_puzzle_schedule: delete_puzzle_schedule_route,
  get_past_schedules: get_past_schedules_route,
  update_puzzle_schedule: update_puzzle_schedule_route
});

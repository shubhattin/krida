import { protectedAdminProcedure, t } from '~/api/trpc_init';
import { z } from 'zod';
import { db } from '~/db/db';
import { crossword_schedules } from '~/db/schema';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { delay } from '~/tools/delay';
import {
  CACHE,
  invalidate_and_refresh_cached,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { publishCrosswordScheduleListingQueue } from '~/lib/qstash';
import { generateRandomAlphanumeric } from '~/tools/kry';

const crossword_schedule_time_order = <T extends { start_time: Date; end_time: Date }>(
  schema: z.ZodType<T>
) =>
  schema.refine((data) => data.start_time < data.end_time, {
    message: 'start_time must be before end_time',
    path: ['end_time']
  });

const add_puzzle_schedule_route = protectedAdminProcedure
  .input(
    crossword_schedule_time_order(
      z.object({
        puzzle_id: z.number().int(),
        start_time: z.coerce.date(),
        end_time: z.coerce.date()
      })
    )
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
    const existing_schedule = await db.query.crossword_schedules.findFirst({
      columns: { id: true },
      where: (table, { and: andFn, gte, lte }) =>
        andFn(lte(table.start_time, end_time), gte(table.end_time, start_time))
    });
    if (existing_schedule) {
      return { success: false, error_code: 'already_exists_in_time_range' };
    }

    revalidatePath('/crossword/schedules');
    const listing_verify_key = generateRandomAlphanumeric(32);
    const [schedule] = await db.transaction(async (tx) => {
      return tx
        .insert(crossword_schedules)
        .values({
          puzzle_id,
          start_time,
          end_time,
          listing_verify_key
        })
        .returning();
    });

    await Promise.allSettled([
      invalidate_and_refresh_cached(CACHE.crossword.current_schedule, NO_CACHE_PARAMS),
      invalidate_and_refresh_cached(CACHE.crossword.next_schedule, NO_CACHE_PARAMS),
      publishCrosswordScheduleListingQueue(
        {
          puzzle_id,
          schedule_id: schedule.id,
          listing_verify_key
        },
        (schedule.start_time.getTime() - new Date().getTime()) / 1000 - 4
      )
    ]);

    return { success: true, schedule_id: schedule.id };
  });

const delete_puzzle_schedule_route = protectedAdminProcedure
  .input(z.object({ schedule_id: z.number().int() }))
  .mutation(async ({ input: { schedule_id } }) => {
    revalidatePath('/crossword/schedules');

    await db.transaction(async (tx) => {
      await tx.delete(crossword_schedules).where(eq(crossword_schedules.id, schedule_id));
    });

    await Promise.allSettled([
      invalidate_and_refresh_cached(CACHE.crossword.current_schedule, NO_CACHE_PARAMS),
      invalidate_and_refresh_cached(CACHE.crossword.next_schedule, NO_CACHE_PARAMS)
    ]);

    return { success: true };
  });

const update_puzzle_schedule_route = protectedAdminProcedure
  .input(
    crossword_schedule_time_order(
      z.object({
        schedule_id: z.number().int(),
        puzzle_id: z.number().int(),
        start_time: z.coerce.date(),
        end_time: z.coerce.date()
      })
    )
  )
  .mutation(async ({ input: { schedule_id, puzzle_id, start_time, end_time } }) => {
    revalidatePath('/crossword/schedules');

    const listing_verify_key = generateRandomAlphanumeric(32);
    await db.transaction(async (tx) => {
      await tx
        .update(crossword_schedules)
        .set({ start_time, end_time, listing_verify_key })
        .where(
          and(eq(crossword_schedules.id, schedule_id), eq(crossword_schedules.puzzle_id, puzzle_id))
        );
    });

    await Promise.allSettled([
      publishCrosswordScheduleListingQueue(
        {
          puzzle_id,
          schedule_id,
          listing_verify_key
        },
        (start_time.getTime() - new Date().getTime()) / 1000 - 4
      ),
      invalidate_and_refresh_cached(CACHE.crossword.current_schedule, NO_CACHE_PARAMS),
      invalidate_and_refresh_cached(CACHE.crossword.next_schedule, NO_CACHE_PARAMS)
    ]);

    return { success: true };
  });

const get_past_schedules_route = protectedAdminProcedure.query(async () => {
  await delay(500);
  const current_time = new Date();
  const past_schedules = await db.query.crossword_schedules.findMany({
    columns: {
      id: true,
      start_time: true,
      end_time: true,
      created_at: true,
      puzzle_id: true
    },
    with: {
      puzzle: {
        columns: { title: true }
      }
    },
    orderBy: (schedules, { desc: descFn }) => [descFn(schedules.created_at)],
    where: (schedules, { lt }) => lt(schedules.end_time, current_time)
  });

  return past_schedules;
});

export const crossword_schedules_router = t.router({
  add_puzzle_schedule: add_puzzle_schedule_route,
  delete_puzzle_schedule: delete_puzzle_schedule_route,
  get_past_schedules: get_past_schedules_route,
  update_puzzle_schedule: update_puzzle_schedule_route
});

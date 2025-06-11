import { protectedAdminProcedure, t } from '~/api/trpc_init';
import { z } from 'zod';
import { db } from '~/db/db';
import { puzzle_game_schedules } from '~/db/schema';
import { revalidatePath } from 'next/cache';

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
        and(gte(table.start_time, start_time), lte(table.end_time, end_time))
    });
    if (existing_schedule) {
      return { success: false, error_code: 'already_exists_in_time_range' };
    }

    revalidatePath('/padavali/schedules/add');
    const schedule = await db
      .insert(puzzle_game_schedules)
      .values({
        puzzle_id,
        start_time,
        end_time
      })
      .returning();
    return {
      success: true,
      schedule_id: schedule[0].id
    };
  });

export const schedules_router = t.router({
  add_puzzle_schedule: add_puzzle_schedule_route
});

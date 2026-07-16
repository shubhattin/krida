import { protectedAdminProcedure, t } from '~/api/trpc_init';
import { z } from 'zod';
import { db, type transactionType } from '~/db/db';
import { padavali_schedules } from '~/db/schema';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { delay } from '~/tools/delay';
import {
  CACHE,
  invalidate_and_refresh_cached,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { publishScheduleListingQueue, publishScheduledPuzzleNotificationQueue } from '~/lib/qstash';
import { generateRandomAlphanumeric } from '~/tools/kry';
import { sendOneSignalNotification } from '~/lib/onesignal';
import { DEFAULT_SHARE_IMAGE_INFO } from '~/components/tags/getPageMetaTags';

export const notify_for_new_scheduled_puzzle = async (title: string) => {
  return await sendOneSignalNotification({
    headings: { en: '🧩 New Puzzle Added ! 🎉' },
    contents: { en: `"${title}" - Puzzle Added, Play Now! 🚀` },
    name: 'new_scheduled_puzzle',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/padavali`,
    chrome_web_image: DEFAULT_SHARE_IMAGE_INFO.url
  });
};

const set_schedule_notification_key = async (
  tx: transactionType,
  puzzle_id: number,
  schedule_id: number,
  notification_key: string | null
) => {
  await tx
    .update(padavali_schedules)
    .set({ notification_key })
    .where(
      and(eq(padavali_schedules.id, schedule_id), eq(padavali_schedules.puzzle_id, puzzle_id))
    );
};

const notify_new_puzzle = async (puzzle_id: number, schedule_id: number, start_time: Date) => {
  const current_time = new Date();
  if (current_time < start_time) {
    const delay_s = (start_time.getTime() - current_time.getTime()) / 1000 - 2; // 2 seconds prior notification;
    const notification_key = generateRandomAlphanumeric(32);
    await db.transaction(async (tx) => {
      await set_schedule_notification_key(tx, puzzle_id, schedule_id, notification_key);
    });
    await publishScheduledPuzzleNotificationQueue(
      {
        puzzle_id,
        schedule_id,
        notification_key
      },
      delay_s
    );
    return 'scheduled';
  } else {
    // current_time >= start_time

    const prev_schedule = (await db.query.padavali_schedules.findFirst({
      where: (table, { eq, and }) => and(eq(table.id, schedule_id), eq(table.puzzle_id, puzzle_id)),
      columns: {
        start_time: true
      }
    }))!;
    // if previous schedule is already before the current time, skip notification
    // as it would have already been notified in the past
    if (current_time >= prev_schedule.start_time) return 'skipped';

    const title = (await db.query.padavali_puzzles.findFirst({
      where: (table, { eq }) => eq(table.id, puzzle_id),
      columns: {
        title: true
      }
    }))!.title;
    await Promise.allSettled([
      notify_for_new_scheduled_puzzle(title),
      db.transaction(async (tx) => {
        await set_schedule_notification_key(tx, puzzle_id, schedule_id, null);
      })
    ]);
    return 'done';
  }
};

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
    const existing_schedule = await db.query.padavali_schedules.findFirst({
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
    const listing_verify_key = generateRandomAlphanumeric(32);
    const [schedule] = await db.transaction(async (tx) => {
      return tx
        .insert(padavali_schedules)
        .values({
          puzzle_id,
          start_time,
          end_time,
          listing_verify_key
        })
        .returning();
    });

    await Promise.allSettled([
      invalidate_and_refresh_cached(CACHE.padavali.current_schedule, NO_CACHE_PARAMS),
      invalidate_and_refresh_cached(CACHE.padavali.next_schedule, NO_CACHE_PARAMS),
      notify_new_puzzle(puzzle_id, schedule.id, start_time),
      publishScheduleListingQueue(
        {
          puzzle_id,
          schedule_id: schedule.id,
          listing_verify_key
        },
        (schedule.start_time.getTime() - new Date().getTime()) / 1000 - 4 // 4 seconds prior listing start
      )
    ]);

    return {
      success: true,
      schedule_id: schedule.id
    };
  });

const delete_puzzle_schedule_route = protectedAdminProcedure
  .input(z.object({ schedule_id: z.number().int() }))
  .mutation(async ({ input: { schedule_id } }) => {
    revalidatePath('/padavali/schedules');

    await db.transaction(async (tx) => {
      await tx.delete(padavali_schedules).where(eq(padavali_schedules.id, schedule_id));
    });

    await Promise.allSettled([
      invalidate_and_refresh_cached(CACHE.padavali.current_schedule, NO_CACHE_PARAMS),
      invalidate_and_refresh_cached(CACHE.padavali.next_schedule, NO_CACHE_PARAMS)
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

    const listing_verify_key = generateRandomAlphanumeric(32);
    await db.transaction(async (tx) => {
      await tx
        .update(padavali_schedules)
        .set({ start_time, end_time, listing_verify_key })
        .where(
          and(eq(padavali_schedules.id, schedule_id), eq(padavali_schedules.puzzle_id, puzzle_id))
        );
    });

    await Promise.allSettled([
      notify_new_puzzle(puzzle_id, schedule_id, start_time),
      publishScheduleListingQueue(
        {
          puzzle_id,
          schedule_id,
          listing_verify_key
        },
        (start_time.getTime() - new Date().getTime()) / 1000 - 4 // 4 seconds prior listing start
      ),
      invalidate_and_refresh_cached(CACHE.padavali.current_schedule, NO_CACHE_PARAMS),
      invalidate_and_refresh_cached(CACHE.padavali.next_schedule, NO_CACHE_PARAMS)
    ]);

    return { success: true };
  });

const get_past_schedules_route = protectedAdminProcedure.query(async () => {
  await delay(500);
  const current_time = new Date();
  const past_schedules = await db.query.padavali_schedules.findMany({
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

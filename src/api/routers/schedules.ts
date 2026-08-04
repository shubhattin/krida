import { protectedAdminProcedure, t } from '~/api/trpc_init';
import { Effect } from 'effect';
import { z } from 'zod';
import { dbRun, dbTransaction, type DbTransaction } from '~/effect/database';
import { padavali_schedules } from '~/db/schema';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { QStashPublisher } from '~/effect/qstash';
import { generateRandomAlphanumeric } from '~/tools/kry';
import { NotificationService } from '~/effect/notifications';
import { DEFAULT_SHARE_IMAGE_INFO } from '~/components/tags/getPageMetaTags';
import { runTrpcEffect } from '~/effect/run';
import { AppConfig } from '~/effect/config';
import { ConfigError, DatabaseError } from '~/effect/errors';

export const notify_for_new_scheduled_puzzle = Effect.fn(
  'padavaliSchedules.notify_for_new_scheduled_puzzle'
)(function* (title: string) {
  const config = yield* AppConfig;
  if (!config.siteUrl) {
    return yield* Effect.fail(
      ConfigError.make({
        message: 'NEXT_PUBLIC_SITE_URL is required for puzzle notifications'
      })
    );
  }
  const notifications = yield* NotificationService;
  return yield* notifications.send({
    headings: { en: '🧩 New Puzzle Added ! 🎉' },
    contents: { en: `"${title}" - Puzzle Added, Play Now! 🚀` },
    name: 'new_scheduled_puzzle',
    url: `${config.siteUrl}/padavali`,
    chrome_web_image: DEFAULT_SHARE_IMAGE_INFO.url
  });
});

const set_schedule_notification_key = async (
  tx: DbTransaction,
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

const notify_new_puzzle = Effect.fn('padavaliSchedules.notify_new_puzzle')(function* (
  puzzle_id: number,
  schedule_id: number,
  start_time: Date
) {
  const current_time = new Date();
  if (current_time < start_time) {
    const delay_s = (start_time.getTime() - current_time.getTime()) / 1000 - 2; // 2 seconds prior notification;
    const notification_key = generateRandomAlphanumeric(32);
    yield* dbTransaction('padavali_schedules.set_notification_key', async (tx) => {
      await set_schedule_notification_key(tx, puzzle_id, schedule_id, notification_key);
    });
    const qstash = yield* QStashPublisher;
    yield* qstash.publishScheduledPuzzleNotification(
      {
        puzzle_id,
        schedule_id,
        notification_key
      },
      delay_s
    );
    return 'scheduled';
  }

  const prev_schedule = yield* dbRun('padavali_schedules.find_current_schedule', (client) =>
    client.query.padavali_schedules.findFirst({
      where: (table, { eq, and }) => and(eq(table.id, schedule_id), eq(table.puzzle_id, puzzle_id)),
      columns: {
        start_time: true
      }
    })
  );
  if (!prev_schedule || current_time >= prev_schedule.start_time) return 'skipped';

  const puzzle = yield* dbRun('padavali_schedules.find_puzzle_title', (client) =>
    client.query.padavali_puzzles.findFirst({
      where: (table, { eq }) => eq(table.id, puzzle_id),
      columns: {
        title: true
      }
    })
  );
  if (!puzzle) return 'skipped';

  yield* notify_for_new_scheduled_puzzle(puzzle.title);
  yield* dbTransaction('padavali_schedules.clear_notification_key', async (tx) => {
    await set_schedule_notification_key(tx, puzzle_id, schedule_id, null);
  });
  return 'done';
});

const refreshScheduleCaches = Effect.fn('padavaliSchedules.refreshScheduleCaches')(function* () {
  yield* invalidate_and_refresh_cache(CACHE.padavali.current_schedule, NO_CACHE_PARAMS);
  yield* invalidate_and_refresh_cache(CACHE.padavali.next_schedule, NO_CACHE_PARAMS);
});

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
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const { puzzle_id, start_time, end_time } = input;
        const existing_schedule = yield* dbRun(
          'padavali_schedules.find_overlapping_schedule',
          (client) =>
            client.query.padavali_schedules.findFirst({
              columns: {
                id: true
              },
              where: (table, { and, gte, lte }) =>
                and(lte(table.start_time, end_time), gte(table.end_time, start_time))
            })
        );
        if (existing_schedule) {
          return { success: false as const, error_code: 'already_exists_in_time_range' as const };
        }

        const listing_verify_key = generateRandomAlphanumeric(32);
        const inserted_schedules = yield* dbTransaction(
          'padavali_schedules.insert_schedule',
          (tx) =>
            tx
              .insert(padavali_schedules)
              .values({
                puzzle_id,
                start_time,
                end_time,
                listing_verify_key
              })
              .returning()
        );
        const schedule = inserted_schedules[0];
        if (!schedule) {
          return yield* Effect.fail(
            DatabaseError.make({
              operation: 'padavali_schedules.insert_schedule',
              cause: new Error('Failed to create schedule')
            })
          );
        }

        yield* Effect.sync(() => revalidatePath('/padavali/schedules'));
        yield* refreshScheduleCaches();
        yield* notify_new_puzzle(puzzle_id, schedule.id, start_time);
        const qstash = yield* QStashPublisher;
        yield* qstash.publishScheduleListing(
          {
            puzzle_id,
            schedule_id: schedule.id,
            listing_verify_key
          },
          (schedule.start_time.getTime() - new Date().getTime()) / 1000 - 4
        );

        return {
          success: true as const,
          schedule_id: schedule.id
        };
      })
    )
  );

const delete_puzzle_schedule_route = protectedAdminProcedure
  .input(z.object({ schedule_id: z.number().int() }))
  .mutation(({ input: { schedule_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* Effect.sync(() => revalidatePath('/padavali/schedules'));

        yield* dbTransaction('padavali_schedules.delete_schedule', async (tx) => {
          await tx.delete(padavali_schedules).where(eq(padavali_schedules.id, schedule_id));
        });

        yield* refreshScheduleCaches();

        return { success: true };
      })
    )
  );

const update_puzzle_schedule_route = protectedAdminProcedure
  .input(
    z.object({
      schedule_id: z.number().int(),
      puzzle_id: z.number().int(),
      start_time: z.coerce.date(),
      end_time: z.coerce.date()
    })
  )
  .mutation(({ input: { schedule_id, puzzle_id, start_time, end_time } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* Effect.sync(() => revalidatePath('/padavali/schedules'));

        const listing_verify_key = generateRandomAlphanumeric(32);
        yield* dbTransaction('padavali_schedules.update_schedule', async (tx) => {
          await tx
            .update(padavali_schedules)
            .set({ start_time, end_time, listing_verify_key })
            .where(
              and(
                eq(padavali_schedules.id, schedule_id),
                eq(padavali_schedules.puzzle_id, puzzle_id)
              )
            );
        });

        yield* notify_new_puzzle(puzzle_id, schedule_id, start_time);
        const qstash = yield* QStashPublisher;
        yield* qstash.publishScheduleListing(
          {
            puzzle_id,
            schedule_id,
            listing_verify_key
          },
          (start_time.getTime() - new Date().getTime()) / 1000 - 4
        );
        yield* refreshScheduleCaches();

        return { success: true };
      })
    )
  );

const get_past_schedules_route = protectedAdminProcedure.query(() =>
  runTrpcEffect(
    Effect.gen(function* () {
      yield* Effect.sleep('500 millis');
      const current_time = new Date();
      const past_schedules = yield* dbRun('padavali_schedules.list_past_schedules', (client) =>
        client.query.padavali_schedules.findMany({
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
        })
      );

      return past_schedules;
    })
  )
);

export const schedules_router = t.router({
  add_puzzle_schedule: add_puzzle_schedule_route,
  delete_puzzle_schedule: delete_puzzle_schedule_route,
  get_past_schedules: get_past_schedules_route,
  update_puzzle_schedule: update_puzzle_schedule_route
});

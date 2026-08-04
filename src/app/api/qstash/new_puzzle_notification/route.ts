import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { Effect } from 'effect';
import { padavali_schedules } from '~/db/schema';
import { and, eq } from 'drizzle-orm';
import { scheduledPuzzleNotificationPayloadSchema, decodeQstashPayload } from '~/effect/qstash';
import { dbRun, dbTransaction } from '~/effect/database';
import { runQstashEffect } from '~/effect/run';
import { BadRequestError } from '~/effect/errors';
import { NotificationService } from '~/effect/notifications';
import { DEFAULT_SHARE_IMAGE_INFO } from '~/components/tags/getPageMetaTags';

export const POST = verifySignatureAppRouter(async (req: Request) => {
  console.log('QStash request received', new Date());
  const body = await req.json();
  return runQstashEffect(
    Effect.gen(function* () {
      const { puzzle_id, schedule_id, notification_key } = yield* decodeQstashPayload(
        scheduledPuzzleNotificationPayloadSchema,
        body
      );

      const schedule = yield* dbRun('qstash.new_puzzle_notification.find_schedule', (client) =>
        client.query.padavali_schedules.findFirst({
          where: (table, { eq: eqFn, and: andFn }) =>
            andFn(
              eqFn(table.id, schedule_id),
              eqFn(table.puzzle_id, puzzle_id),
              eqFn(table.notification_key, notification_key)
            ),
          columns: {
            id: true
          },
          with: {
            puzzle: {
              columns: {
                title: true
              }
            }
          }
        })
      );
      if (!schedule) {
        console.error('Invalid or expired request');
        return yield* Effect.fail(
          BadRequestError.make({
            message: 'Invalid or expired request'
          })
        );
      }

      const notifications = yield* NotificationService;
      yield* notifications.send({
        headings: { en: '🧩 New Puzzle Added ! 🎉' },
        contents: { en: `"${schedule.puzzle.title}" - Puzzle Added, Play Now! 🚀` },
        name: 'new_scheduled_puzzle',
        url: process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/padavali`
          : null,
        chrome_web_image: DEFAULT_SHARE_IMAGE_INFO.url
      });

      yield* dbTransaction('qstash.new_puzzle_notification.clear_notification_key', async (tx) => {
        await tx
          .update(padavali_schedules)
          .set({
            notification_key: null
          })
          .where(
            and(eq(padavali_schedules.id, schedule_id), eq(padavali_schedules.puzzle_id, puzzle_id))
          );
      });

      const message = `Notification for Puzzle ${puzzle_id} successfully sent for Schedule ${schedule_id}.`;
      console.log(message);
      return message;
    }),
    {
      onSuccess: (message) => new Response(message)
    }
  );
});

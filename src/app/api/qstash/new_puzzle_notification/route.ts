import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { Effect } from 'effect';
import { padavali_puzzles, padavali_schedules } from '~/db/schema';
import { and, eq } from 'drizzle-orm';
import { scheduledPuzzleNotificationPayloadSchema, decodeQstashPayload } from '~/effect/qstash';
import { dbTransaction } from '~/effect/database';
import { runQstashEffect } from '~/effect/run';
import { ConfigError } from '~/effect/errors';
import { NotificationService } from '~/effect/notifications';
import { DEFAULT_SHARE_IMAGE_INFO } from '~/components/tags/getPageMetaTags';
import { AppConfig } from '~/effect/config';

export const POST = verifySignatureAppRouter(async (req: Request) => {
  console.log('QStash request received', new Date());
  const body = await req.json();
  return runQstashEffect(
    Effect.gen(function* () {
      const { puzzle_id, schedule_id, notification_key } = yield* decodeQstashPayload(
        scheduledPuzzleNotificationPayloadSchema,
        body
      );

      const config = yield* AppConfig;
      if (!config.siteUrl) {
        return yield* Effect.fail(
          ConfigError.make({
            message: 'NEXT_PUBLIC_SITE_URL is required for puzzle notifications'
          })
        );
      }

      // Claim first (clear key) so QStash retries cannot double-send.
      const claimed = yield* dbTransaction(
        'qstash.new_puzzle_notification.claim_notification_key',
        async (tx) => {
          const updated = await tx
            .update(padavali_schedules)
            .set({ notification_key: null })
            .where(
              and(
                eq(padavali_schedules.id, schedule_id),
                eq(padavali_schedules.puzzle_id, puzzle_id),
                eq(padavali_schedules.notification_key, notification_key)
              )
            )
            .returning();

          if (!updated[0]) return null;

          const puzzle = await tx.query.padavali_puzzles.findFirst({
            columns: { title: true },
            where: eq(padavali_puzzles.id, puzzle_id)
          });
          if (!puzzle) return null;

          return { id: updated[0].id, title: puzzle.title };
        }
      );

      if (!claimed) {
        // Already claimed by a prior attempt (or invalid). Acknowledge so QStash stops retrying.
        const message = `Notification claim already consumed for Puzzle ${puzzle_id} Schedule ${schedule_id}.`;
        console.log(message);
        return message;
      }

      const notifications = yield* NotificationService;
      yield* notifications.send({
        headings: { en: '🧩 New Puzzle Added ! 🎉' },
        contents: { en: `"${claimed.title}" - Puzzle Added, Play Now! 🚀` },
        name: 'new_scheduled_puzzle',
        url: `${config.siteUrl}/padavali`,
        chrome_web_image: DEFAULT_SHARE_IMAGE_INFO.url
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

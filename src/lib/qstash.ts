import { Client } from '@upstash/qstash';
import { z } from 'zod';

const client = new Client(); // load from env

const QSTAHS_PUBLISH_BASE_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/api/qstash`;

const PRDO_MODE=process.env.NODE_ENV === 'production';

export const schedule_archival_publish_schema = z.object({
  puzzle_id: z.number().int().positive(),
  schedule_id: z.number().int().positive(),
  archival_verify_key: z.string().length(32)
});
/**
 * Mark a scheduled puzzle as listed after expiration; invalidation is handled through key verification.
 */
export const publishScheduleListingQueue = async (
  data: z.infer<typeof schedule_archival_publish_schema>,
  delay_s: number
) => {
  if (!process.env.NEXT_PUBLIC_SITE_URL) return;
  const body = schedule_archival_publish_schema.parse(data);

  await client.publishJSON({
    url: QSTAHS_PUBLISH_BASE_URL + '/schedule_listing',
    delay: delay_s,
    body
  });
  console.log(
    `Queue published to list puzzle ${body.puzzle_id} for schedule ${body.schedule_id} (delay: ${delay_s}s)`
  );
};

export const scheduled_puzzle_notification_publish_schema = z.object({
  puzzle_id: z.number().int().positive(),
  schedule_id: z.number().int().positive(),
  notification_key: z.string().length(32)
});
export const publishScheduledPuzzleNotificationQueue = async (
  data: z.infer<typeof scheduled_puzzle_notification_publish_schema>,
  delay_s: number
) => {
  if (!process.env.NEXT_PUBLIC_SITE_URL || !PRDO_MODE) return;
  const body = scheduled_puzzle_notification_publish_schema.parse(data);

  await client.publishJSON({
    url: QSTAHS_PUBLISH_BASE_URL + '/new_puzzle_notification',
    delay: delay_s,
    body
  });
  console.log(
    `Queue published for New Puzzle ${body.puzzle_id} with schedule ${body.schedule_id} (delay: ${delay_s}s)`
  );
};

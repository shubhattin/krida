import { Client } from '@upstash/qstash';
import { z } from 'zod';

const client = new Client(); // load from env

const QSTAHS_PUBLISH_BASE_URL = process.env.QSTASH_PUBLISH_URL!;

export const schedule_archival_publish_schema = z.object({
  puzzle_id: z.number().int().positive(),
  schedule_id: z.number().int().positive(),
  archival_verify_key: z.string().length(32)
});
/**
 * Archive a Scheduled Puzzle after expiration, invalidation is handled through key verification
 */
export const publishScheduleArchivalQueue = async (
  data: z.infer<typeof schedule_archival_publish_schema>,
  delay_s: number
) => {
  const body = schedule_archival_publish_schema.parse(data);

  await client.publishJSON({
    url: QSTAHS_PUBLISH_BASE_URL + '/schedule_archival',
    delay: delay_s,
    body
  });
  console.log(
    `Queue published for puzzle ${body.puzzle_id} with schedule ${body.schedule_id} (delay: ${delay_s}s)`
  );
};

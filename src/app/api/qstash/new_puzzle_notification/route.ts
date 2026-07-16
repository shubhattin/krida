import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { scheduled_puzzle_notification_publish_schema } from '~/lib/qstash';
import { db } from '~/db/db';
import { padavali_schedules } from '~/db/schema';
import { and, eq } from 'drizzle-orm';
import { notify_for_new_scheduled_puzzle } from '~/api/routers/schedules';

export const POST = verifySignatureAppRouter(async (req: Request) => {
  console.log('QStash request received', new Date());
  const body = await req.json();
  const { puzzle_id, schedule_id, notification_key } =
    scheduled_puzzle_notification_publish_schema.parse(body);

  const schedule = await db.query.padavali_schedules.findFirst({
    where: (table, { eq, and }) =>
      and(
        eq(table.id, schedule_id),
        eq(table.puzzle_id, puzzle_id),
        eq(table.notification_key, notification_key)
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
  });
  if (!schedule) {
    console.error(`Invalid or expired request`);
    return new Response('Invalid or expired request', { status: 400 });
  }

  await Promise.allSettled([
    db
      .update(padavali_schedules)
      .set({
        notification_key: null
      })
      .where(
        and(eq(padavali_schedules.id, schedule_id), eq(padavali_schedules.puzzle_id, puzzle_id))
      ),
    notify_for_new_scheduled_puzzle(schedule.puzzle.title)
  ]);

  console.log(
    `Notification for Puzzle ${puzzle_id} successfully sent for Schedule ${schedule_id}.`
  );

  return new Response(
    `Notification for Puzzle ${puzzle_id} successfully sent for Schedule ${schedule_id}.`
  );
});

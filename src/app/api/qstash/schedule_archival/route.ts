import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { schedule_archival_publish_schema } from '~/lib/qstash';
import { db } from '~/db/db';
import { redis, REDIS_CACHE_KEYS } from '~/db/redis';
import { puzzle_game_schedules, word_puzzles } from '~/db/schema';
import { and, eq } from 'drizzle-orm';

export const POST = verifySignatureAppRouter(async (req: Request) => {
  console.log('QStash request received', new Date());
  const body = await req.json();
  const { puzzle_id, schedule_id, archival_verify_key } =
    schedule_archival_publish_schema.parse(body);

  const schedule = await db.query.puzzle_game_schedules.findFirst({
    where: (table, { eq, and }) =>
      and(
        eq(table.id, schedule_id),
        eq(table.puzzle_id, puzzle_id),
        eq(table.archival_verify_key, archival_verify_key)
      ),
    columns: {
      id: true
    }
  });
  if (!schedule) {
    console.error(`Invalid or expired request`);
    return new Response('Invalid or expired request', { status: 400 });
  }

  await Promise.allSettled([
    db
      .update(word_puzzles)
      .set({
        archived: true,
        last_archived_at: new Date()
      })
      .where(eq(word_puzzles.id, puzzle_id)),
    db
      .update(puzzle_game_schedules)
      .set({
        archival_verify_key: null
      })
      .where(
        and(
          eq(puzzle_game_schedules.id, schedule_id),
          eq(puzzle_game_schedules.puzzle_id, puzzle_id)
        )
      )
  ]);
  // Cache invalidation
  await redis.del(REDIS_CACHE_KEYS.archived_puzzle_list());

  console.log(`Puzzle ${puzzle_id} archived successfully for Schedule ${schedule_id}.`);

  return new Response(`Puzzle ${puzzle_id} archived successfully for Schedule ${schedule_id}.`);
});

import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { schedule_archival_publish_schema } from '~/lib/qstash';
import { db } from '~/db/db';
import {
  CACHE,
  invalidate_and_refresh_cached,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { puzzle_game_schedules, word_puzzles } from '~/db/schema';
import { and, eq } from 'drizzle-orm';
import { notify_for_listed_puzzle } from '~/api/routers/puzzle';

export const POST = verifySignatureAppRouter(async (req: Request) => {
  console.log('QStash request received', new Date());
  const body = await req.json();
  const { puzzle_id, schedule_id, listing_verify_key } =
    schedule_archival_publish_schema.parse(body);

  const schedule = await db.query.puzzle_game_schedules.findFirst({
    where: (table, { eq, and }) =>
      and(
        eq(table.id, schedule_id),
        eq(table.puzzle_id, puzzle_id),
        eq(table.listing_verify_key, listing_verify_key)
      ),
    columns: {
      id: true
    },
    with: {
      puzzle: {
        columns: {
          id: true,
          title: true,
          slug: true
        }
      }
    }
  });
  if (!schedule) {
    console.error(`Invalid or expired request`);
    return new Response('Invalid or expired request', { status: 400 });
  }

  await Promise.all([
    db
      .update(word_puzzles)
      .set({
        listed: true,
        last_listed_at: new Date()
      })
      .where(eq(word_puzzles.id, puzzle_id)),
    db
      .update(puzzle_game_schedules)
      .set({
        listing_verify_key: null
      })
      .where(
        and(
          eq(puzzle_game_schedules.id, schedule_id),
          eq(puzzle_game_schedules.puzzle_id, puzzle_id)
        )
      )
  ]);
  await Promise.allSettled([
    invalidate_and_refresh_cached(CACHE.listed_puzzle_list, NO_CACHE_PARAMS),
    invalidate_and_refresh_cached(CACHE.word_puzzle, {
      slug: schedule.puzzle.slug
    }),
    notify_for_listed_puzzle(schedule.puzzle.title, schedule.puzzle.slug)
  ]);

  console.log(`Puzzle ${puzzle_id} listed successfully for schedule ${schedule_id}.`);

  return new Response(`Puzzle ${puzzle_id} listed successfully for schedule ${schedule_id}.`);
});

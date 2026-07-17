import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { crossword_schedule_listing_publish_schema } from '~/lib/qstash';
import { db } from '~/db/db';
import {
  CACHE,
  invalidate_and_refresh_cached,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { crossword_schedules, crossword_puzzles } from '~/db/schema';
import { and, eq } from 'drizzle-orm';
import { analyzeWordPlacements } from '~/util/cross_word/placement';

export const POST = verifySignatureAppRouter(async (req: Request) => {
  console.log('QStash crossword schedule listing request received', new Date());
  const body = await req.json();
  const { puzzle_id, schedule_id, listing_verify_key } =
    crossword_schedule_listing_publish_schema.parse(body);

  const schedule = await db.query.crossword_schedules.findFirst({
    where: (table, { eq: eqFn, and: andFn }) =>
      andFn(
        eqFn(table.id, schedule_id),
        eqFn(table.puzzle_id, puzzle_id),
        eqFn(table.listing_verify_key, listing_verify_key)
      ),
    columns: { id: true },
    with: {
      puzzle: {
        columns: { id: true, title: true, slug: true, grid_data: true, word_list: true }
      }
    }
  });
  if (!schedule) {
    console.error('Invalid or expired crossword schedule listing request');
    return new Response('Invalid or expired request', { status: 400 });
  }

  const analysis = analyzeWordPlacements(schedule.puzzle.grid_data, schedule.puzzle.word_list);
  if (!analysis.canList) {
    console.error(
      `Crossword puzzle ${puzzle_id} cannot be listed: invalid word placements for schedule ${schedule_id}`
    );
    return new Response('Puzzle cannot be listed: invalid word placements', { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(crossword_puzzles)
      .set({
        listed: true,
        last_listed_at: new Date()
      })
      .where(eq(crossword_puzzles.id, puzzle_id));
    await tx
      .update(crossword_schedules)
      .set({ listing_verify_key: null })
      .where(
        and(eq(crossword_schedules.id, schedule_id), eq(crossword_schedules.puzzle_id, puzzle_id))
      );
  });

  await Promise.allSettled([
    invalidate_and_refresh_cached(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS),
    invalidate_and_refresh_cached(CACHE.crossword.word_puzzle, {
      slug: schedule.puzzle.slug
    }),
    invalidate_and_refresh_cached(CACHE.crossword.current_schedule, NO_CACHE_PARAMS)
  ]);

  console.log(`Crossword puzzle ${puzzle_id} listed successfully for schedule ${schedule_id}.`);
  return new Response(
    `Crossword puzzle ${puzzle_id} listed successfully for schedule ${schedule_id}.`
  );
});

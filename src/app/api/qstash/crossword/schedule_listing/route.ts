import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { Effect } from 'effect';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { crossword_schedules, crossword_puzzles } from '~/db/schema';
import { and, eq } from 'drizzle-orm';
import { analyzeWordPlacements } from '~/util/cross_word/placement';
import { scheduleListingPayloadSchema, decodeQstashPayload } from '~/effect/qstash';
import { dbRun, dbTransaction } from '~/effect/database';
import { runQstashEffect } from '~/effect/run';
import { BadRequestError } from '~/effect/errors';

const ignoreFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.exit(effect).pipe(Effect.asVoid);

export const POST = verifySignatureAppRouter(async (req: Request) => {
  console.log('QStash crossword schedule listing request received', new Date());
  const body = await req.json();
  return runQstashEffect(
    Effect.gen(function* () {
      const { puzzle_id, schedule_id, listing_verify_key } = yield* decodeQstashPayload(
        scheduleListingPayloadSchema,
        body
      );

      const schedule = yield* dbRun('qstash.crossword_schedule_listing.find_schedule', (client) =>
        client.query.crossword_schedules.findFirst({
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
        })
      );
      if (!schedule) {
        console.error('Invalid or expired crossword schedule listing request');
        return yield* Effect.fail(
          BadRequestError.make({
            message: 'Invalid or expired request'
          })
        );
      }

      const analysis = analyzeWordPlacements(schedule.puzzle.grid_data, schedule.puzzle.word_list);
      if (!analysis.canList) {
        console.error(
          `Crossword puzzle ${puzzle_id} cannot be listed: invalid word placements for schedule ${schedule_id}`
        );
        return yield* Effect.fail(
          BadRequestError.make({
            message: 'Puzzle cannot be listed: invalid word placements'
          })
        );
      }

      yield* dbTransaction('qstash.crossword_schedule_listing.apply_listing', async (tx) => {
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
            and(
              eq(crossword_schedules.id, schedule_id),
              eq(crossword_schedules.puzzle_id, puzzle_id)
            )
          );
      });

      yield* Effect.all(
        [
          ignoreFailure(
            invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS)
          ),
          ignoreFailure(
            invalidate_and_refresh_cache(CACHE.crossword.word_puzzle, {
              slug: schedule.puzzle.slug
            })
          ),
          ignoreFailure(
            invalidate_and_refresh_cache(CACHE.crossword.current_schedule, NO_CACHE_PARAMS)
          )
        ],
        { discard: true }
      );

      const message = `Crossword puzzle ${puzzle_id} listed successfully for schedule ${schedule_id}.`;
      console.log(message);
      return message;
    }),
    {
      onSuccess: (message) => new Response(message)
    }
  );
});

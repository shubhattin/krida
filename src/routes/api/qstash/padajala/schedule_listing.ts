import { createFileRoute } from '@tanstack/react-router';
import { Effect } from 'effect';
import {
  CACHE,
  invalidate_and_refresh_cache,
  invalidate_padajala_sitemap,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { padajala_puzzles, puzzle_schedules, puzzles } from '~/db/schema';
import { and, eq } from 'drizzle-orm';
import { analyzeWordPlacements } from '~/util/padajala/placement';
import { scheduleListingPayloadSchema, decodeQstashPayload } from '~/effect/qstash';
import { dbRunHttp, dbTransaction } from '~/effect/database';
import { runQstashEffect } from '~/effect/run';
import { BadRequestError } from '~/effect/errors';
import { verifyQstashRequest } from '~/lib/qstash_verify';
import { ignoreReportedFailure } from '~/effect/report';

const ignoreFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  ignoreReportedFailure(effect, 'qstash.padajala.side_effect');

export const Route = createFileRoute('/api/qstash/padajala/schedule_listing')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log('QStash padajala schedule listing request received', new Date());
        const verified = await verifyQstashRequest(request, '/padajala/schedule_listing');
        if (!verified.ok) return verified.response;
        const body = verified.body;

        return runQstashEffect(
          Effect.gen(function* () {
            const { puzzle_id, schedule_id, listing_verify_key } = yield* decodeQstashPayload(
              scheduleListingPayloadSchema,
              body
            );

            const [schedule] = yield* dbRunHttp(
              'qstash.padajala_schedule_listing.find_schedule',
              (client) =>
                client
                  .select({
                    id: puzzle_schedules.id,
                    title: puzzles.title,
                    slug: puzzles.slug,
                    grid_data: padajala_puzzles.grid_data,
                    word_list: padajala_puzzles.word_list
                  })
                  .from(puzzle_schedules)
                  .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
                  .innerJoin(padajala_puzzles, eq(padajala_puzzles.id, puzzles.id))
                  .where(
                    and(
                      eq(puzzles.kind, 'padajala'),
                      eq(puzzle_schedules.id, schedule_id),
                      eq(puzzle_schedules.puzzle_id, puzzle_id),
                      eq(puzzle_schedules.listing_verify_key, listing_verify_key)
                    )
                  )
                  .limit(1)
            );
            if (!schedule) {
              console.error('Invalid or expired padajala schedule listing request');
              return yield* Effect.fail(
                BadRequestError.make({
                  message: 'Invalid or expired request'
                })
              );
            }

            const analysis = analyzeWordPlacements(schedule.grid_data, schedule.word_list);
            if (!analysis.canList) {
              console.error(
                `Padajala puzzle ${puzzle_id} cannot be listed: invalid word placements for schedule ${schedule_id}`
              );
              return yield* Effect.fail(
                BadRequestError.make({
                  message: 'Puzzle cannot be listed: invalid word placements'
                })
              );
            }

            yield* dbTransaction('qstash.padajala_schedule_listing.apply_listing', async (tx) => {
              await tx
                .update(puzzles)
                .set({
                  listed: true,
                  last_listed_at: new Date()
                })
                .where(and(eq(puzzles.id, puzzle_id), eq(puzzles.kind, 'padajala')));
              await tx
                .update(puzzle_schedules)
                .set({ listing_verify_key: null })
                .where(
                  and(
                    eq(puzzle_schedules.id, schedule_id),
                    eq(puzzle_schedules.puzzle_id, puzzle_id),
                    eq(puzzle_schedules.listing_verify_key, listing_verify_key)
                  )
                );
            });

            yield* Effect.all(
              [
                ignoreFailure(
                  invalidate_and_refresh_cache(CACHE.padajala.listed_puzzle_list, NO_CACHE_PARAMS)
                ),
                ignoreFailure(
                  invalidate_and_refresh_cache(CACHE.padajala.word_puzzle, {
                    slug: schedule.slug
                  })
                ),
                ignoreFailure(
                  invalidate_and_refresh_cache(CACHE.padajala.current_schedule, NO_CACHE_PARAMS)
                ),
                ignoreFailure(invalidate_padajala_sitemap())
              ],
              { discard: true }
            );

            const message = `Padajala puzzle ${puzzle_id} listed successfully for schedule ${schedule_id}.`;
            console.log(message);
            return message;
          }),
          {
            onSuccess: (message) => new Response(message)
          }
        );
      }
    }
  }
});

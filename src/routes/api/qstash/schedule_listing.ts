import { createFileRoute } from '@tanstack/react-router';
import { Effect } from 'effect';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { padavali_schedules, padavali_puzzles } from '~/db/schema';
import { and, eq } from 'drizzle-orm';
import { notify_for_listed_puzzle } from '~/api/routers/puzzle';
import { scheduleListingPayloadSchema, decodeQstashPayload } from '~/effect/qstash';
import { dbRun, dbTransaction } from '~/effect/database';
import { runQstashEffect } from '~/effect/run';
import { BadRequestError } from '~/effect/errors';
import { verifyQstashRequest } from '~/lib/qstash_verify';

const ignoreFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.exit(effect).pipe(Effect.asVoid);

export const Route = createFileRoute('/api/qstash/schedule_listing')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log('QStash request received', new Date());
        const verified = await verifyQstashRequest(request);
        if (!verified.ok) return verified.response;
        const body = verified.body;

        return runQstashEffect(
          Effect.gen(function* () {
            const { puzzle_id, schedule_id, listing_verify_key } = yield* decodeQstashPayload(
              scheduleListingPayloadSchema,
              body
            );

            const schedule = yield* dbRun(
              'qstash.padavali_schedule_listing.find_schedule',
              (client) =>
                client.query.padavali_schedules.findFirst({
                  where: (table, { eq: eqFn, and: andFn }) =>
                    andFn(
                      eqFn(table.id, schedule_id),
                      eqFn(table.puzzle_id, puzzle_id),
                      eqFn(table.listing_verify_key, listing_verify_key)
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

            yield* dbTransaction('qstash.padavali_schedule_listing.apply_listing', async (tx) => {
              await tx
                .update(padavali_puzzles)
                .set({
                  listed: true,
                  last_listed_at: new Date()
                })
                .where(eq(padavali_puzzles.id, puzzle_id));
              await tx
                .update(padavali_schedules)
                .set({
                  listing_verify_key: null
                })
                .where(
                  and(
                    eq(padavali_schedules.id, schedule_id),
                    eq(padavali_schedules.puzzle_id, puzzle_id)
                  )
                );
            });

            yield* Effect.all(
              [
                ignoreFailure(
                  invalidate_and_refresh_cache(CACHE.padavali.listed_puzzle_list, NO_CACHE_PARAMS)
                ),
                ignoreFailure(
                  invalidate_and_refresh_cache(CACHE.padavali.word_puzzle, {
                    slug: schedule.puzzle.slug
                  })
                ),
                ignoreFailure(notify_for_listed_puzzle(schedule.puzzle.title, schedule.puzzle.slug))
              ],
              { discard: true }
            );

            const message = `Puzzle ${puzzle_id} listed successfully for schedule ${schedule_id}.`;
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

import { createFileRoute } from '@tanstack/react-router';
import { Effect } from 'effect';
import {
  CACHE,
  invalidate_and_refresh_cache,
  invalidate_padavali_sitemap,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { puzzle_schedules, puzzles } from '~/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { scheduleListingPayloadSchema, decodeQstashPayload } from '~/effect/qstash';
import { dbRunHttp, dbTransaction } from '~/effect/database';
import { runQstashEffect } from '~/effect/run';
import { BadRequestError } from '~/effect/errors';
import { verifyQstashRequest } from '~/lib/qstash_verify';
import { ignoreReportedFailure } from '~/effect/report';

const ignoreFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  ignoreReportedFailure(effect, 'qstash.padavali.side_effect');

export const Route = createFileRoute('/api/qstash/schedule_listing')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log('QStash request received', new Date());
        const verified = await verifyQstashRequest(request, '/schedule_listing');
        if (!verified.ok) return verified.response;
        const body = verified.body;

        return runQstashEffect(
          Effect.gen(function* () {
            const { puzzle_id, schedule_id, listing_verify_key } = yield* decodeQstashPayload(
              scheduleListingPayloadSchema,
              body
            );

            const [schedule] = yield* dbRunHttp('qstash.schedule_listing.find_schedule', (client) =>
              client
                .select({
                  id: puzzle_schedules.id,
                  slug: puzzles.slug,
                  kind: puzzles.kind
                })
                .from(puzzle_schedules)
                .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
                .where(
                  and(
                    // Padajala has its own publisher + placement gate; never list it here.
                    ne(puzzles.kind, 'padajala'),
                    eq(puzzle_schedules.id, schedule_id),
                    eq(puzzle_schedules.puzzle_id, puzzle_id),
                    eq(puzzle_schedules.listing_verify_key, listing_verify_key)
                  )
                )
                .limit(1)
            );
            if (!schedule) {
              console.error('Invalid or expired request');
              return yield* Effect.fail(
                BadRequestError.make({
                  message: 'Invalid or expired request'
                })
              );
            }

            yield* dbTransaction('qstash.schedule_listing.apply_listing', async (tx) => {
              await tx
                .update(puzzles)
                .set({
                  listed: true,
                  last_listed_at: new Date()
                })
                .where(and(eq(puzzles.id, puzzle_id), eq(puzzles.kind, schedule.kind)));
              await tx
                .update(puzzle_schedules)
                .set({
                  listing_verify_key: null
                })
                .where(
                  and(
                    eq(puzzle_schedules.id, schedule_id),
                    eq(puzzle_schedules.puzzle_id, puzzle_id),
                    eq(puzzle_schedules.listing_verify_key, listing_verify_key)
                  )
                );
            });

            const kind = schedule.kind;
            const listedRefresh =
              kind === 'padavali'
                ? invalidate_and_refresh_cache(CACHE.padavali.listed_puzzle_list, NO_CACHE_PARAMS)
                : kind === 'padajala'
                  ? invalidate_and_refresh_cache(CACHE.padajala.listed_puzzle_list, NO_CACHE_PARAMS)
                  : kind === 'dvayi'
                    ? invalidate_and_refresh_cache(CACHE.dvayi.listed_puzzle_list, NO_CACHE_PARAMS)
                    : kind === 'bhramita'
                      ? invalidate_and_refresh_cache(
                          CACHE.bhramita.listed_puzzle_list,
                          NO_CACHE_PARAMS
                        )
                      : kind === 'surupa'
                        ? invalidate_and_refresh_cache(
                            CACHE.surupa.listed_puzzle_list,
                            NO_CACHE_PARAMS
                          )
                        : invalidate_and_refresh_cache(
                            CACHE.anveshi.listed_puzzle_list,
                            NO_CACHE_PARAMS
                          );
            const wordRefresh =
              kind === 'padavali'
                ? invalidate_and_refresh_cache(CACHE.padavali.word_puzzle, { slug: schedule.slug })
                : kind === 'padajala'
                  ? invalidate_and_refresh_cache(CACHE.padajala.word_puzzle, {
                      slug: schedule.slug
                    })
                  : kind === 'dvayi'
                    ? invalidate_and_refresh_cache(CACHE.dvayi.word_puzzle, { slug: schedule.slug })
                    : kind === 'bhramita'
                      ? invalidate_and_refresh_cache(CACHE.bhramita.word_puzzle, {
                          slug: schedule.slug
                        })
                      : kind === 'surupa'
                        ? invalidate_and_refresh_cache(CACHE.surupa.word_puzzle, {
                            slug: schedule.slug
                          })
                        : invalidate_and_refresh_cache(CACHE.anveshi.word_puzzle, {
                            slug: schedule.slug
                          });

            yield* Effect.all(
              [
                ignoreFailure(listedRefresh),
                ignoreFailure(wordRefresh),
                kind === 'padavali' ? ignoreFailure(invalidate_padavali_sitemap()) : Effect.void
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

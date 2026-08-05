import { protectedAdminProcedure, t } from '~/api/trpc_init';
import { Effect } from 'effect';
import { z } from 'zod';
import { dbRun, dbTransaction } from '~/effect/database';
import { crossword_schedules } from '~/db/schema';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { QStashPublisher, qstashDelaySeconds } from '~/effect/qstash';
import { generateRandomAlphanumeric } from '~/tools/kry';
import { DatabaseError, NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catch((error) =>
      Effect.logWarning('Crossword schedule post-commit side effect failed').pipe(
        Effect.annotateLogs({ error }),
        Effect.asVoid
      )
    )
  );

const crossword_schedule_time_order = <T extends { start_time: Date; end_time: Date }>(
  schema: z.ZodType<T>
) =>
  schema.refine((data) => data.start_time < data.end_time, {
    message: 'start_time must be before end_time',
    path: ['end_time']
  });

const refreshScheduleCaches = Effect.fn('crosswordSchedules.refreshScheduleCaches')(function* () {
  yield* invalidate_and_refresh_cache(CACHE.crossword.current_schedule, NO_CACHE_PARAMS);
  yield* invalidate_and_refresh_cache(CACHE.crossword.next_schedule, NO_CACHE_PARAMS);
});

const add_puzzle_schedule_route = protectedAdminProcedure
  .input(
    crossword_schedule_time_order(
      z.object({
        puzzle_id: z.number().int(),
        start_time: z.coerce.date(),
        end_time: z.coerce.date()
      })
    )
  )
  .output(
    z.discriminatedUnion('success', [
      z.object({
        success: z.literal(true),
        schedule_id: z.number().int()
      }),
      z.object({
        success: z.literal(false),
        error_code: z.enum(['already_exists_in_time_range'])
      })
    ])
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const { puzzle_id, start_time, end_time } = input;
        const existing_schedule = yield* dbRun(
          'crossword_schedules.find_overlapping_schedule',
          (client) =>
            client.query.crossword_schedules.findFirst({
              columns: { id: true },
              where: (table, { and: andFn, gte, lte }) =>
                andFn(lte(table.start_time, end_time), gte(table.end_time, start_time))
            })
        );
        if (existing_schedule) {
          return { success: false as const, error_code: 'already_exists_in_time_range' as const };
        }

        const listing_verify_key = generateRandomAlphanumeric(32);
        const inserted_schedules = yield* dbTransaction(
          'crossword_schedules.insert_schedule',
          (tx) =>
            tx
              .insert(crossword_schedules)
              .values({
                puzzle_id,
                start_time,
                end_time,
                listing_verify_key
              })
              .returning()
        );
        const schedule = inserted_schedules[0];
        if (!schedule) {
          return yield* Effect.fail(
            DatabaseError.make({
              operation: 'crossword_schedules.insert_schedule',
              cause: new Error('Failed to create schedule')
            })
          );
        }

        yield* Effect.sync(() => revalidatePath('/padajala/schedules'));
        yield* settle(refreshScheduleCaches());
        const qstash = yield* QStashPublisher;
        yield* settle(
          qstash.publishCrosswordScheduleListing(
            {
              puzzle_id,
              schedule_id: schedule.id,
              listing_verify_key
            },
            qstashDelaySeconds((schedule.start_time.getTime() - new Date().getTime()) / 1000 - 4)
          )
        );

        return { success: true as const, schedule_id: schedule.id };
      })
    )
  );

const delete_puzzle_schedule_route = protectedAdminProcedure
  .input(z.object({ schedule_id: z.number().int() }))
  .mutation(({ input: { schedule_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* dbTransaction('crossword_schedules.delete_schedule', async (tx) => {
          await tx.delete(crossword_schedules).where(eq(crossword_schedules.id, schedule_id));
        });

        yield* Effect.sync(() => revalidatePath('/padajala/schedules'));
        yield* refreshScheduleCaches();

        return { success: true };
      })
    )
  );

const update_puzzle_schedule_route = protectedAdminProcedure
  .input(
    crossword_schedule_time_order(
      z.object({
        schedule_id: z.number().int(),
        puzzle_id: z.number().int(),
        start_time: z.coerce.date(),
        end_time: z.coerce.date()
      })
    )
  )
  .mutation(({ input: { schedule_id, puzzle_id, start_time, end_time } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const listing_verify_key = generateRandomAlphanumeric(32);
        const updated_schedules = yield* dbTransaction(
          'crossword_schedules.update_schedule',
          (tx) =>
            tx
              .update(crossword_schedules)
              .set({ start_time, end_time, listing_verify_key })
              .where(
                and(
                  eq(crossword_schedules.id, schedule_id),
                  eq(crossword_schedules.puzzle_id, puzzle_id)
                )
              )
              .returning()
        );
        const updated = updated_schedules[0];

        if (!updated) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_schedule',
              message: 'Schedule not found'
            })
          );
        }

        yield* Effect.sync(() => revalidatePath('/padajala/schedules'));
        yield* settle(refreshScheduleCaches());
        const qstash = yield* QStashPublisher;
        yield* settle(
          qstash.publishCrosswordScheduleListing(
            {
              puzzle_id,
              schedule_id,
              listing_verify_key
            },
            qstashDelaySeconds((start_time.getTime() - new Date().getTime()) / 1000 - 4)
          )
        );

        return { success: true };
      })
    )
  );

const get_past_schedules_route = protectedAdminProcedure.query(() =>
  runTrpcEffect(
    Effect.gen(function* () {
      yield* Effect.sleep('500 millis');
      const current_time = new Date();
      const past_schedules = yield* dbRun('crossword_schedules.list_past_schedules', (client) =>
        client.query.crossword_schedules.findMany({
          columns: {
            id: true,
            start_time: true,
            end_time: true,
            created_at: true,
            puzzle_id: true
          },
          with: {
            puzzle: {
              columns: { title: true }
            }
          },
          orderBy: (schedules, { desc: descFn }) => [descFn(schedules.created_at)],
          where: (schedules, { lt }) => lt(schedules.end_time, current_time)
        })
      );

      return past_schedules;
    })
  )
);

export const crossword_schedules_router = t.router({
  add_puzzle_schedule: add_puzzle_schedule_route,
  delete_puzzle_schedule: delete_puzzle_schedule_route,
  get_past_schedules: get_past_schedules_route,
  update_puzzle_schedule: update_puzzle_schedule_route
});

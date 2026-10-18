import { protectedAdminProcedure, t } from '~/api/trpc_init';
import { Effect } from 'effect';
import { z } from 'zod';
import { dbRunHttp, dbTransaction } from '~/effect/database';
import { puzzle_schedules, puzzles } from '~/db/schema';
import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, ne, or } from 'drizzle-orm';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { QStashPublisher, qstashDelaySeconds } from '~/effect/qstash';
import { generateRandomAlphanumeric } from '~/tools/kry';
import { runTrpcEffect } from '~/effect/run';
import { BadRequestError, DatabaseError, NotFoundError } from '~/effect/errors';
import { reportSwallowedError } from '~/effect/report';
import { GAME_KINDS, isGameKind, type GameKind } from '~/util/catalog/tags';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catch((error) =>
      reportSwallowedError('schedules.side_effect')(error).pipe(
        Effect.andThen(
          Effect.logWarning('Schedule post-commit side effect failed').pipe(
            Effect.annotateLogs({ error }),
            Effect.asVoid
          )
        )
      )
    )
  );

const refreshScheduleCaches = (kind: GameKind) =>
  Effect.gen(function* () {
    if (kind === 'padavali') {
      yield* invalidate_and_refresh_cache(CACHE.padavali.current_schedule, NO_CACHE_PARAMS);
      yield* invalidate_and_refresh_cache(CACHE.padavali.next_schedule, NO_CACHE_PARAMS);
    } else if (kind === 'padajala') {
      yield* invalidate_and_refresh_cache(CACHE.padajala.current_schedule, NO_CACHE_PARAMS);
      yield* invalidate_and_refresh_cache(CACHE.padajala.next_schedule, NO_CACHE_PARAMS);
    }
  });

const publishListing = (
  kind: GameKind,
  data: { puzzle_id: number; schedule_id: number; listing_verify_key: string },
  start_time: Date
) =>
  Effect.gen(function* () {
    const qstash = yield* QStashPublisher;
    const delay = qstashDelaySeconds((start_time.getTime() - Date.now()) / 1000 - 4);
    if (kind === 'padajala') {
      yield* qstash.publishPadajalaScheduleListing(data, delay);
    } else {
      yield* qstash.publishScheduleListing(data, delay);
    }
  });

const puzzleKind = (puzzleId: number) =>
  dbRunHttp('schedules.puzzle_kind', async (client) => {
    const [row] = await client
      .select({ kind: puzzles.kind })
      .from(puzzles)
      .where(eq(puzzles.id, puzzleId))
      .limit(1);
    return row?.kind;
  });

const requireKind = (kind: string | undefined) =>
  Effect.gen(function* () {
    if (!kind || !isGameKind(kind)) {
      return yield* Effect.fail(
        NotFoundError.make({ resource: 'puzzle', message: 'Puzzle not found' })
      );
    }
    return kind;
  });

const scheduleWindow = z
  .object({
    puzzle_id: z.number().int(),
    start_time: z.coerce.date(),
    end_time: z.coerce.date()
  })
  .refine((value) => value.start_time < value.end_time, {
    message: 'Start time must be before end time',
    path: ['end_time']
  });

const list_schedules_route = protectedAdminProcedure
  .input(
    z.object({
      kinds: z.array(z.enum(GAME_KINDS)).max(GAME_KINDS.length).default([]),
      query: z.string().max(200).default(''),
      when: z.enum(['upcoming', 'past']).default('upcoming')
    })
  )
  .query(({ input }) =>
    runTrpcEffect(
      dbRunHttp('schedules.list', (client) => {
        const now = new Date();
        const conditions = [
          input.when === 'upcoming'
            ? gte(puzzle_schedules.end_time, now)
            : lt(puzzle_schedules.end_time, now)
        ];
        if (input.kinds.length > 0) conditions.push(inArray(puzzles.kind, input.kinds));
        for (const token of tokenizeSearchQuery(input.query)) {
          const pattern = `%${escapeIlikeToken(token)}%`;
          conditions.push(or(ilike(puzzles.title, pattern), ilike(puzzles.slug, pattern))!);
        }
        return client
          .select({
            id: puzzle_schedules.id,
            puzzle_id: puzzle_schedules.puzzle_id,
            kind: puzzles.kind,
            title: puzzles.title,
            slug: puzzles.slug,
            start_time: puzzle_schedules.start_time,
            end_time: puzzle_schedules.end_time,
            created_at: puzzle_schedules.created_at
          })
          .from(puzzle_schedules)
          .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
          .where(and(...conditions))
          .orderBy(
            input.when === 'upcoming'
              ? asc(puzzle_schedules.start_time)
              : desc(puzzle_schedules.end_time)
          );
      })
    )
  );

const add_puzzle_schedule_route = protectedAdminProcedure
  .input(scheduleWindow)
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
        const kind = yield* requireKind(yield* puzzleKind(puzzle_id));
        if (kind === 'padajala') {
          return yield* Effect.fail(
            BadRequestError.make({
              message: 'Use the padajala schedule manager for padajala puzzles'
            })
          );
        }
        const [existing_schedule] = yield* dbRunHttp('schedules.find_overlapping', (client) =>
          client
            .select({ id: puzzle_schedules.id })
            .from(puzzle_schedules)
            .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
            .where(
              and(
                eq(puzzles.kind, kind),
                lte(puzzle_schedules.start_time, end_time),
                gte(puzzle_schedules.end_time, start_time)
              )
            )
            .limit(1)
        );
        if (existing_schedule) {
          return { success: false as const, error_code: 'already_exists_in_time_range' as const };
        }

        const listing_verify_key = generateRandomAlphanumeric(32);
        const inserted_schedules = yield* dbTransaction('schedules.insert', (tx) =>
          tx
            .insert(puzzle_schedules)
            .values({ puzzle_id, start_time, end_time, listing_verify_key })
            .returning()
        );
        const schedule = inserted_schedules[0];
        if (!schedule) {
          return yield* Effect.fail(
            DatabaseError.make({
              operation: 'schedules.insert',
              cause: new Error('Failed to create schedule')
            })
          );
        }

        yield* settle(refreshScheduleCaches(kind));
        yield* settle(
          publishListing(
            kind,
            { puzzle_id, schedule_id: schedule.id, listing_verify_key },
            schedule.start_time
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
        const [existing] = yield* dbRunHttp('schedules.kind_for_delete', (client) =>
          client
            .select({ kind: puzzles.kind })
            .from(puzzle_schedules)
            .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
            .where(eq(puzzle_schedules.id, schedule_id))
            .limit(1)
        );
        yield* dbTransaction('schedules.delete', async (tx) => {
          await tx.delete(puzzle_schedules).where(eq(puzzle_schedules.id, schedule_id));
        });
        if (existing && isGameKind(existing.kind)) {
          yield* refreshScheduleCaches(existing.kind);
        }
        return { success: true };
      })
    )
  );

const update_puzzle_schedule_route = protectedAdminProcedure
  .input(scheduleWindow.and(z.object({ schedule_id: z.number().int() })))
  .mutation(({ input: { schedule_id, puzzle_id, start_time, end_time } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const kind = yield* requireKind(yield* puzzleKind(puzzle_id));
        if (kind === 'padajala') {
          return yield* Effect.fail(
            BadRequestError.make({
              message: 'Use the padajala schedule manager for padajala puzzles'
            })
          );
        }
        const [previous] = yield* dbRunHttp('schedules.kind_before_update', (client) =>
          client
            .select({ kind: puzzles.kind })
            .from(puzzle_schedules)
            .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
            .where(eq(puzzle_schedules.id, schedule_id))
            .limit(1)
        );
        if (!previous) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'schedule', message: 'Schedule not found' })
          );
        }
        const previousKind = isGameKind(previous.kind) ? previous.kind : undefined;
        const [overlap] = yield* dbRunHttp('schedules.find_overlapping_update', (client) =>
          client
            .select({ id: puzzle_schedules.id })
            .from(puzzle_schedules)
            .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
            .where(
              and(
                eq(puzzles.kind, kind),
                ne(puzzle_schedules.id, schedule_id),
                lte(puzzle_schedules.start_time, end_time),
                gte(puzzle_schedules.end_time, start_time)
              )
            )
            .limit(1)
        );
        if (overlap) {
          return { success: false as const, error_code: 'already_exists_in_time_range' as const };
        }

        const listing_verify_key = generateRandomAlphanumeric(32);
        yield* dbTransaction('schedules.update', async (tx) => {
          await tx
            .update(puzzle_schedules)
            .set({ start_time, end_time, listing_verify_key, puzzle_id })
            .where(eq(puzzle_schedules.id, schedule_id));
        });

        yield* settle(
          publishListing(kind, { puzzle_id, schedule_id, listing_verify_key }, start_time)
        );
        yield* settle(refreshScheduleCaches(kind));
        if (previousKind && previousKind !== kind) {
          yield* settle(refreshScheduleCaches(previousKind));
        }
        return { success: true as const };
      })
    )
  );

const get_past_schedules_route = protectedAdminProcedure.query(() =>
  runTrpcEffect(
    dbRunHttp('schedules.list_past_padavali', (client) =>
      client
        .select({
          id: puzzle_schedules.id,
          start_time: puzzle_schedules.start_time,
          end_time: puzzle_schedules.end_time,
          created_at: puzzle_schedules.created_at,
          puzzle_id: puzzle_schedules.puzzle_id,
          puzzle_title: puzzles.title
        })
        .from(puzzle_schedules)
        .innerJoin(
          puzzles,
          and(eq(puzzles.id, puzzle_schedules.puzzle_id), eq(puzzles.kind, 'padavali'))
        )
        .where(lt(puzzle_schedules.end_time, new Date()))
        .orderBy(puzzle_schedules.created_at)
    ).pipe(
      Effect.map((rows) =>
        rows.map(({ puzzle_title, ...schedule }) => ({
          ...schedule,
          puzzle: { title: puzzle_title }
        }))
      )
    )
  )
);

export const schedules_router = t.router({
  list_schedules: list_schedules_route,
  add_puzzle_schedule: add_puzzle_schedule_route,
  delete_puzzle_schedule: delete_puzzle_schedule_route,
  get_past_schedules: get_past_schedules_route,
  update_puzzle_schedule: update_puzzle_schedule_route
});

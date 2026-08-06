import { Effect } from 'effect';
import {
  protectedAdminProcedure,
  publicProcedure,
  t,
  verify_cloudflare_turnstile_token
} from '../trpc_init';
import { z } from 'zod';
import { padavali_sessions, padavali_gameplay_stats, padavali_puzzles } from '~/db/schema';
import { dbRun } from '~/effect/database';
import { location_list_enum } from '~/db/types';
import { script_list_enum } from '~/state/script_list';
import { and, count, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { BadRequestError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import { padavaliActiveWords } from '~/util/puzzle/word_list';
import {
  claimPlaySession,
  completePlaySession,
  releasePlaySessionClaim
} from '~/api/stats_play_guard';

const verifyTurnstile = Effect.fn('padavaliStats.verifyTurnstile')(function* (token: string) {
  const is_valid = yield* verify_cloudflare_turnstile_token(token);
  if (!is_valid) {
    return yield* Effect.fail(
      BadRequestError.make({
        message: 'Invalid turnstile token'
      })
    );
  }
});

const submit_stats_route = publicProcedure
  .input(
    z.object({
      turnstile_token: z.string(),
      info: z.object({
        puzzle_id: z.number().int(),
        time_taken: z.number().int(),
        accuracy: z.number().int(),
        correct_attempts: z.number().int(),
        total_attempts: z.number().int(),
        session_id: z.number().int(),
        practice_mode: z.boolean().default(false)
      })
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const { turnstile_token, info } = input;
        yield* verifyTurnstile(turnstile_token);

        const {
          puzzle_id,
          time_taken,
          accuracy,
          correct_attempts,
          total_attempts,
          session_id,
          practice_mode
        } = info;

        const session = yield* dbRun('padavali_stats.find_session', (client) =>
          client.query.padavali_sessions.findFirst({
            columns: { id: true },
            where: (tbl, { and: andFn, eq: eqFn }) =>
              andFn(eqFn(tbl.id, session_id), eqFn(tbl.puzzle_id, puzzle_id))
          })
        );
        if (!session) {
          return yield* Effect.fail(
            BadRequestError.make({
              message: 'Invalid session for puzzle'
            })
          );
        }

        if (practice_mode) {
          yield* dbRun('padavali_stats.mark_practice_session', async (client) => {
            await client
              .update(padavali_sessions)
              .set({ practice_mode: true })
              .where(eq(padavali_sessions.id, session_id));
          });
        }

        yield* dbRun('padavali_stats.insert_gameplay_stat', async (client) => {
          await client
            .insert(padavali_gameplay_stats)
            .values({
              puzzle_id,
              session_id,
              time_taken,
              accuracy,
              correct_attempts,
              total_attempts
            })
            .onConflictDoNothing({ target: padavali_gameplay_stats.session_id });
        });

        return {
          submitted: true
        };
      })
    )
  );

const update_games_started_route = publicProcedure
  .input(
    z.object({
      turnstile_token: z.string(),
      id: z.number().int(),
      location: location_list_enum,
      script: script_list_enum,
      practice_mode: z.boolean().default(false),
      /** Stable per browser play attempt — dedupes spammy start calls. */
      client_play_id: z.string().uuid()
    })
  )
  .mutation(({ input: { turnstile_token, id, location, script, practice_mode, client_play_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const claim = yield* claimPlaySession('padavali', client_play_id);
        if (claim.status === 'existing') {
          return { success: true, session_id: claim.sessionId };
        }

        yield* verifyTurnstile(turnstile_token).pipe(
          Effect.tapError(() => releasePlaySessionClaim('padavali', client_play_id))
        );

        const inserted_sessions = yield* dbRun('padavali_stats.create_session', (client) =>
          client
            .insert(padavali_sessions)
            .values({
              puzzle_id: id,
              location,
              script,
              practice_mode
            })
            .returning()
        ).pipe(Effect.tapError(() => releasePlaySessionClaim('padavali', client_play_id)));
        const session = inserted_sessions[0];
        if (!session) {
          yield* releasePlaySessionClaim('padavali', client_play_id);
          return yield* Effect.fail(
            BadRequestError.make({
              message: 'Failed to create session'
            })
          );
        }

        yield* completePlaySession('padavali', client_play_id, session.id);
        return { success: true, session_id: session.id };
      })
    )
  );

const update_session_practice_mode_route = publicProcedure
  .input(
    z.object({
      turnstile_token: z.string(),
      session_id: z.number().int(),
      practice_mode: z.boolean()
    })
  )
  .mutation(({ input: { turnstile_token, session_id, practice_mode } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* verifyTurnstile(turnstile_token);

        yield* dbRun('padavali_stats.update_session_practice_mode', async (client) => {
          await client
            .update(padavali_sessions)
            .set({ practice_mode })
            .where(eq(padavali_sessions.id, session_id));
        });

        return { success: true };
      })
    )
  );

const get_stats_data_input_schema = z
  .object({
    puzzle_ids: z.array(z.number().int()).optional(),
    all_time: z.boolean(),
    start_date: z.date().optional(),
    end_date: z.date().optional()
  })
  .superRefine((data, ctx) => {
    if (!data.all_time && (!data.start_date || !data.end_date)) {
      ctx.addIssue({
        code: 'custom',
        message: 'start_date and end_date are required when all_time is false',
        path: ['start_date']
      });
    }
    if (!data.all_time && data.start_date && data.end_date && data.start_date > data.end_date) {
      ctx.addIssue({
        code: 'custom',
        message: 'start_date must be before end_date',
        path: ['end_date']
      });
    }
  });

const get_stats_data_route = protectedAdminProcedure
  .input(get_stats_data_input_schema)
  .query(({ input: { puzzle_ids, all_time, start_date, end_date } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const { sessions, stats, puzzles } = yield* Effect.all({
          sessions: dbRun('padavali_stats.list_sessions', (client) =>
            client.query.padavali_sessions.findMany({
              columns: {
                id: true,
                created_at: true,
                practice_mode: true,
                location: true,
                script: true
              },
              where: (tbl, { and: andFn, gte: gteFn, lte: lteFn, inArray: inArrayFn }) => {
                const conditions = [];
                if (puzzle_ids && puzzle_ids.length > 0) {
                  conditions.push(inArrayFn(tbl.puzzle_id, puzzle_ids));
                }
                if (!all_time && start_date && end_date) {
                  conditions.push(gteFn(tbl.created_at, start_date));
                  conditions.push(lteFn(tbl.created_at, end_date));
                }
                return conditions.length > 0 ? andFn(...conditions) : undefined;
              }
            })
          ),
          stats: dbRun('padavali_stats.list_gameplay_stats', (client) =>
            client.query.padavali_gameplay_stats.findMany({
              columns: {
                id: true,
                created_at: true,
                session_id: true,
                time_taken: true,
                accuracy: true,
                correct_attempts: true,
                total_attempts: true
              },
              where: (tbl, { and: andFn, gte: gteFn, lte: lteFn, inArray: inArrayFn }) => {
                const conditions = [];
                if (puzzle_ids && puzzle_ids.length > 0) {
                  conditions.push(inArrayFn(tbl.puzzle_id, puzzle_ids));
                }
                if (!all_time && start_date && end_date) {
                  conditions.push(gteFn(tbl.created_at, start_date));
                  conditions.push(lteFn(tbl.created_at, end_date));
                }
                return conditions.length > 0 ? andFn(...conditions) : undefined;
              }
            })
          ),
          puzzles: dbRun('padavali_stats.list_puzzles_for_word_count', (client) =>
            client.query.padavali_puzzles.findMany({
              columns: { word_list: true },
              where:
                puzzle_ids && puzzle_ids.length > 0
                  ? (tbl, { inArray: inArrayFn }) => inArrayFn(tbl.id, puzzle_ids)
                  : undefined
            })
          )
        });

        const total_words = puzzles.reduce(
          (sum, puzzle) => sum + padavaliActiveWords(puzzle.word_list).length,
          0
        );

        return { sessions, stats, correct_attempts: total_words };
      })
    )
  );

const get_top_puzzles_input_schema = z
  .object({
    all_time: z.boolean(),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
    limit: z.number().int().min(1).max(50).default(10)
  })
  .superRefine((data, ctx) => {
    if (!data.all_time && (!data.start_date || !data.end_date)) {
      ctx.addIssue({
        code: 'custom',
        message: 'start_date and end_date are required when all_time is false',
        path: ['start_date']
      });
    }
    if (!data.all_time && data.start_date && data.end_date && data.start_date > data.end_date) {
      ctx.addIssue({
        code: 'custom',
        message: 'start_date must be before end_date',
        path: ['end_date']
      });
    }
  });

/** Top puzzles by plays — totals both practice and no-hint sessions. */
const get_top_puzzles_route = protectedAdminProcedure
  .input(get_top_puzzles_input_schema)
  .query(({ input: { all_time, start_date, end_date, limit } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const dateConditions =
          !all_time && start_date && end_date
            ? [
                gte(padavali_sessions.created_at, start_date),
                lte(padavali_sessions.created_at, end_date)
              ]
            : [];

        const topSessions = yield* dbRun('padavali_stats.get_top_sessions', (client) =>
          client
            .select({
              puzzle_id: padavali_sessions.puzzle_id,
              title: padavali_puzzles.title,
              started: count()
            })
            .from(padavali_sessions)
            .innerJoin(padavali_puzzles, eq(padavali_puzzles.id, padavali_sessions.puzzle_id))
            .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
            .groupBy(padavali_sessions.puzzle_id, padavali_puzzles.title)
            .orderBy(desc(count()))
            .limit(limit)
        );

        type TopPuzzle = {
          puzzle_id: number;
          title: string;
          started: number;
          completed: number;
        };

        if (topSessions.length === 0) {
          const puzzles: TopPuzzle[] = [];
          return { puzzles };
        }

        const puzzleIds = topSessions.map((row) => row.puzzle_id);
        const statsDateConditions =
          !all_time && start_date && end_date
            ? [
                gte(padavali_gameplay_stats.created_at, start_date),
                lte(padavali_gameplay_stats.created_at, end_date)
              ]
            : [];

        const completionRows = yield* dbRun('padavali_stats.get_top_completion_counts', (client) =>
          client
            .select({
              puzzle_id: padavali_gameplay_stats.puzzle_id,
              completed: count()
            })
            .from(padavali_gameplay_stats)
            .where(
              and(
                inArray(padavali_gameplay_stats.puzzle_id, puzzleIds),
                ...(statsDateConditions.length > 0 ? statsDateConditions : [])
              )
            )
            .groupBy(padavali_gameplay_stats.puzzle_id)
        );

        const completedByPuzzle = new Map(
          completionRows.map((row) => [row.puzzle_id, Number(row.completed)])
        );

        return {
          puzzles: topSessions.map((row) => ({
            puzzle_id: row.puzzle_id,
            title: row.title,
            started: Number(row.started),
            completed: completedByPuzzle.get(row.puzzle_id) ?? 0
          }))
        };
      })
    )
  );

export const padavali_stats_router = t.router({
  submit_stats: submit_stats_route,
  update_games_started: update_games_started_route,
  update_session_practice_mode: update_session_practice_mode_route,
  get_stats_data: get_stats_data_route,
  get_top_puzzles: get_top_puzzles_route
});

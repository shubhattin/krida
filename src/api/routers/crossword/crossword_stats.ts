import { Effect } from 'effect';
import {
  protectedAdminProcedure,
  publicProcedure,
  t,
  verify_cloudflare_turnstile_token
} from '../../trpc_init';
import { z } from 'zod';
import { crossword_sessions, crossword_gameplay_stats, crossword_puzzles } from '~/db/schema';
import { dbRun } from '~/effect/database';
import { and, count, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import {
  crossword_submit_stats_input_schema,
  crossword_update_games_started_input_schema
} from '~/db/crossword_shared';
import { BadRequestError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import { crosswordActiveWords } from '~/util/puzzle/word_list';

const verifyTurnstile = Effect.fn('crosswordStats.verifyTurnstile')(function* (token: string) {
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
  .input(crossword_submit_stats_input_schema)
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const { turnstile_token, info } = input;
        yield* verifyTurnstile(turnstile_token);

        const {
          puzzle_id,
          time_taken,
          accuracy,
          total_entries,
          total_cells,
          prefilled_cells,
          letter_inputs,
          incorrect_entry_attempts,
          session_id
        } = info;

        const session = yield* dbRun('crossword_stats.find_session', (client) =>
          client.query.crossword_sessions.findFirst({
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

        yield* dbRun('crossword_stats.insert_gameplay_stat', async (client) => {
          await client
            .insert(crossword_gameplay_stats)
            .values({
              puzzle_id,
              session_id,
              time_taken,
              accuracy,
              total_entries,
              total_cells,
              prefilled_cells,
              letter_inputs,
              incorrect_entry_attempts
            })
            .onConflictDoNothing({ target: crossword_gameplay_stats.session_id });
        });

        return { submitted: true };
      })
    )
  );

const update_games_started_route = publicProcedure
  .input(crossword_update_games_started_input_schema)
  .mutation(({ input: { turnstile_token, id, location } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* verifyTurnstile(turnstile_token);

        const inserted_sessions = yield* dbRun('crossword_stats.create_session', (client) =>
          client
            .insert(crossword_sessions)
            .values({
              puzzle_id: id,
              location
            })
            .returning()
        );
        const session = inserted_sessions[0];
        if (!session) {
          return yield* Effect.fail(
            BadRequestError.make({
              message: 'Failed to create session'
            })
          );
        }

        return { success: true, session_id: session.id };
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
          sessions: dbRun('crossword_stats.list_sessions', (client) =>
            client.query.crossword_sessions.findMany({
              columns: {
                id: true,
                created_at: true,
                location: true
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
          stats: dbRun('crossword_stats.list_gameplay_stats', (client) =>
            client.query.crossword_gameplay_stats.findMany({
              columns: {
                id: true,
                created_at: true,
                session_id: true,
                time_taken: true,
                accuracy: true,
                total_entries: true,
                total_cells: true,
                prefilled_cells: true,
                letter_inputs: true,
                incorrect_entry_attempts: true
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
          puzzles: dbRun('crossword_stats.list_puzzles_for_word_count', (client) =>
            client.query.crossword_puzzles.findMany({
              columns: { word_list: true },
              where:
                puzzle_ids && puzzle_ids.length > 0
                  ? (tbl, { inArray: inArrayFn }) => inArrayFn(tbl.id, puzzle_ids)
                  : undefined
            })
          )
        });

        const total_words = puzzles.reduce(
          (sum, puzzle) => sum + crosswordActiveWords(puzzle.word_list).length,
          0
        );

        return { sessions, stats, total_words };
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

const get_top_puzzles_route = protectedAdminProcedure
  .input(get_top_puzzles_input_schema)
  .query(({ input: { all_time, start_date, end_date, limit } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const dateConditions =
          !all_time && start_date && end_date
            ? [
                gte(crossword_sessions.created_at, start_date),
                lte(crossword_sessions.created_at, end_date)
              ]
            : [];

        const topSessions = yield* dbRun('crossword_stats.get_top_sessions', (client) =>
          client
            .select({
              puzzle_id: crossword_sessions.puzzle_id,
              title: crossword_puzzles.title,
              started: count()
            })
            .from(crossword_sessions)
            .innerJoin(crossword_puzzles, eq(crossword_puzzles.id, crossword_sessions.puzzle_id))
            .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
            .groupBy(crossword_sessions.puzzle_id, crossword_puzzles.title)
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
                gte(crossword_gameplay_stats.created_at, start_date),
                lte(crossword_gameplay_stats.created_at, end_date)
              ]
            : [];

        const completionRows = yield* dbRun('crossword_stats.get_top_completion_counts', (client) =>
          client
            .select({
              puzzle_id: crossword_gameplay_stats.puzzle_id,
              completed: count()
            })
            .from(crossword_gameplay_stats)
            .where(
              and(
                inArray(crossword_gameplay_stats.puzzle_id, puzzleIds),
                ...(statsDateConditions.length > 0 ? statsDateConditions : [])
              )
            )
            .groupBy(crossword_gameplay_stats.puzzle_id)
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

export const crossword_stats_router = t.router({
  submit_stats: submit_stats_route,
  update_games_started: update_games_started_route,
  get_stats_data: get_stats_data_route,
  get_top_puzzles: get_top_puzzles_route
});

import { Effect } from 'effect';
import {
  protectedAdminProcedure,
  publicProcedure,
  t,
  verify_cloudflare_turnstile_token
} from '../../trpc_init';
import { crossword_sessions, crossword_gameplay_stats, crossword_puzzles } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { and, count, desc, eq, gte, ilike, inArray, isNotNull, lte, max, or, sql } from 'drizzle-orm';
import {
  crossword_submit_stats_input_schema,
  crossword_update_games_started_input_schema
} from '~/db/crossword_shared';
import { BadRequestError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import { crosswordActiveWords } from '~/util/puzzle/word_list';
import {
  claimPlaySession,
  completePlaySession,
  releasePlaySessionClaim
} from '~/api/stats_play_guard';
import { displayUserName, sessionUserFields } from '~/api/session_user';
import {
  get_stats_data_input_schema,
  get_top_puzzles_input_schema,
  get_top_users_input_schema,
  get_user_list_input_schema
} from '~/api/stats_query_schema';
import { escapeIlikeToken } from '~/util/puzzle/search';

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

        const session = yield* dbRunHttp('crossword_stats.find_session', (client) =>
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

        yield* dbRunHttp('crossword_stats.insert_gameplay_stat', async (client) => {
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
  .mutation(({ input: { turnstile_token, id, location, client_play_id }, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const claim = yield* claimPlaySession('crossword', client_play_id);
        if (claim.status === 'existing') {
          return { success: true, session_id: claim.sessionId };
        }

        yield* verifyTurnstile(turnstile_token).pipe(
          Effect.tapError(() => releasePlaySessionClaim('crossword', client_play_id))
        );

        const userFields = sessionUserFields(ctx.user);
        const inserted_sessions = yield* dbRunHttp('crossword_stats.create_session', (client) =>
          client
            .insert(crossword_sessions)
            .values({
              puzzle_id: id,
              location,
              user_id: userFields.user_id,
              user_name: userFields.user_name
            })
            .returning()
        ).pipe(Effect.tapError(() => releasePlaySessionClaim('crossword', client_play_id)));
        const session = inserted_sessions[0];
        if (!session) {
          yield* releasePlaySessionClaim('crossword', client_play_id);
          return yield* Effect.fail(
            BadRequestError.make({
              message: 'Failed to create session'
            })
          );
        }

        yield* completePlaySession('crossword', client_play_id, session.id);
        return { success: true, session_id: session.id };
      })
    )
  );

const get_stats_data_route = protectedAdminProcedure
  .input(get_stats_data_input_schema)
  .query(({ input: { puzzle_ids, user_ids, all_time, start_date, end_date } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const selectedUserIds = user_ids ?? [];
        const filterByUsers = selectedUserIds.length > 0;
        const { sessions, stats, puzzles } = yield* Effect.all({
          sessions: dbRunHttp('crossword_stats.list_sessions', (client) =>
            client.query.crossword_sessions.findMany({
              columns: {
                id: true,
                created_at: true,
                location: true,
                user_id: true
              },
              where: (tbl, { and: andFn, gte: gteFn, lte: lteFn, inArray: inArrayFn }) => {
                const conditions = [];
                if (puzzle_ids && puzzle_ids.length > 0) {
                  conditions.push(inArrayFn(tbl.puzzle_id, puzzle_ids));
                }
                if (filterByUsers) {
                  conditions.push(inArrayFn(tbl.user_id, selectedUserIds));
                }
                if (!all_time && start_date && end_date) {
                  conditions.push(gteFn(tbl.created_at, start_date));
                  conditions.push(lteFn(tbl.created_at, end_date));
                }
                return conditions.length > 0 ? andFn(...conditions) : undefined;
              }
            })
          ),
          stats: dbRunHttp('crossword_stats.list_gameplay_stats', async (client) => {
            if (filterByUsers) {
              const conditions = [inArray(crossword_sessions.user_id, selectedUserIds)];
              if (puzzle_ids && puzzle_ids.length > 0) {
                conditions.push(inArray(crossword_gameplay_stats.puzzle_id, puzzle_ids));
              }
              if (!all_time && start_date && end_date) {
                conditions.push(gte(crossword_gameplay_stats.created_at, start_date));
                conditions.push(lte(crossword_gameplay_stats.created_at, end_date));
              }
              return client
                .select({
                  id: crossword_gameplay_stats.id,
                  created_at: crossword_gameplay_stats.created_at,
                  session_id: crossword_gameplay_stats.session_id,
                  time_taken: crossword_gameplay_stats.time_taken,
                  accuracy: crossword_gameplay_stats.accuracy,
                  total_entries: crossword_gameplay_stats.total_entries,
                  total_cells: crossword_gameplay_stats.total_cells,
                  prefilled_cells: crossword_gameplay_stats.prefilled_cells,
                  letter_inputs: crossword_gameplay_stats.letter_inputs,
                  incorrect_entry_attempts: crossword_gameplay_stats.incorrect_entry_attempts
                })
                .from(crossword_gameplay_stats)
                .innerJoin(
                  crossword_sessions,
                  eq(crossword_gameplay_stats.session_id, crossword_sessions.id)
                )
                .where(and(...conditions));
            }

            return client.query.crossword_gameplay_stats.findMany({
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
            });
          }),
          puzzles: dbRunHttp('crossword_stats.list_puzzles_for_word_count', (client) =>
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

        const topSessions = yield* dbRunHttp('crossword_stats.get_top_sessions', (client) =>
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

        const completionRows = yield* dbRunHttp(
          'crossword_stats.get_top_completion_counts',
          (client) =>
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

const get_top_users_route = protectedAdminProcedure
  .input(get_top_users_input_schema)
  .query(({ input: { all_time, start_date, end_date, limit, puzzle_ids } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const conditions = [isNotNull(crossword_sessions.user_id)];
        if (!all_time && start_date && end_date) {
          conditions.push(gte(crossword_sessions.created_at, start_date));
          conditions.push(lte(crossword_sessions.created_at, end_date));
        }
        if (puzzle_ids && puzzle_ids.length > 0) {
          conditions.push(inArray(crossword_sessions.puzzle_id, puzzle_ids));
        }

        const topSessions = yield* dbRunHttp('crossword_stats.get_top_users', (client) =>
          client
            .select({
              user_id: crossword_sessions.user_id,
              name: max(crossword_sessions.user_name),
              started: count()
            })
            .from(crossword_sessions)
            .where(and(...conditions))
            .groupBy(crossword_sessions.user_id)
            .orderBy(desc(count()))
            .limit(limit)
        );

        const users = topSessions.flatMap((row) => {
          if (!row.user_id) return [];
          return [
            {
              user_id: row.user_id,
              name: displayUserName(row.user_id, row.name),
              started: Number(row.started),
              completed: 0
            }
          ];
        });

        if (users.length === 0) {
          return { users };
        }

        const userIds = users.map((row) => row.user_id);
        const statsConditions = [inArray(crossword_sessions.user_id, userIds)];
        if (!all_time && start_date && end_date) {
          statsConditions.push(gte(crossword_gameplay_stats.created_at, start_date));
          statsConditions.push(lte(crossword_gameplay_stats.created_at, end_date));
        }
        if (puzzle_ids && puzzle_ids.length > 0) {
          statsConditions.push(inArray(crossword_gameplay_stats.puzzle_id, puzzle_ids));
        }

        const completionRows = yield* dbRunHttp(
          'crossword_stats.get_top_user_completions',
          (client) =>
            client
              .select({
                user_id: crossword_sessions.user_id,
                completed: count()
              })
              .from(crossword_gameplay_stats)
              .innerJoin(
                crossword_sessions,
                eq(crossword_gameplay_stats.session_id, crossword_sessions.id)
              )
              .where(and(...statsConditions))
              .groupBy(crossword_sessions.user_id)
        );

        const completedByUser = new Map(
          completionRows.flatMap((row) =>
            row.user_id ? [[row.user_id, Number(row.completed)] as const] : []
          )
        );

        return {
          users: users.map((row) => ({
            ...row,
            completed: completedByUser.get(row.user_id) ?? 0
          }))
        };
      })
    )
  );

const get_user_list_page_route = protectedAdminProcedure
  .input(get_user_list_input_schema)
  .query(({ input: { page, size, search } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const trimmedSearch = search?.trim();
        const conditions = [isNotNull(crossword_sessions.user_id)];
        if (trimmedSearch) {
          const pattern = `%${escapeIlikeToken(trimmedSearch)}%`;
          conditions.push(
            or(
              ilike(crossword_sessions.user_name, pattern),
              ilike(crossword_sessions.user_id, pattern)
            )!
          );
        }
        const whereClause = and(...conditions);
        const offset = (page - 1) * size;

        const { countResult, rows } = yield* Effect.all({
          countResult: dbRunHttp('crossword_stats.count_users', (client) =>
            client
              .select({
                count: sql<number>`cast(count(distinct ${crossword_sessions.user_id}) as int)`
              })
              .from(crossword_sessions)
              .where(whereClause)
          ),
          rows: dbRunHttp('crossword_stats.list_users', (client) =>
            client
              .select({
                user_id: crossword_sessions.user_id,
                name: max(crossword_sessions.user_name),
                plays: count()
              })
              .from(crossword_sessions)
              .where(whereClause)
              .groupBy(crossword_sessions.user_id)
              .orderBy(desc(count()))
              .limit(size)
              .offset(offset)
          )
        });

        const list = rows.flatMap((row) => {
          if (!row.user_id) return [];
          return [
            {
              id: row.user_id,
              name: displayUserName(row.user_id, row.name),
              plays: Number(row.plays)
            }
          ];
        });

        const total = Number(countResult[0]?.count ?? 0);
        const pageCount = Math.max(1, Math.ceil(total / size));

        return {
          list,
          total,
          page,
          pageCount,
          hasPrev: page > 1,
          hasNext: page < pageCount
        };
      })
    )
  );

export const crossword_stats_router = t.router({
  submit_stats: submit_stats_route,
  update_games_started: update_games_started_route,
  get_stats_data: get_stats_data_route,
  get_top_puzzles: get_top_puzzles_route,
  get_top_users: get_top_users_route,
  get_user_list_page: get_user_list_page_route
});

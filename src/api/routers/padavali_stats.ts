import { Effect } from 'effect';
import { protectedAdminProcedure, publicProcedure, t } from '../trpc_init';
import { z } from 'zod';
import { padavali_sessions, padavali_gameplay_stats, padavali_puzzles } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { location_list_enum } from '~/db/types';
import { script_list_enum } from '~/state/script_list';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  max,
  or,
  sql
} from 'drizzle-orm';
import { BadRequestError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import { padavaliActiveWords } from '~/util/puzzle/word_list';
import {
  claimPlaySession,
  completePlaySession,
  releasePlaySessionClaim
} from '~/api/stats_play_guard';
import { displayUserName, sessionUserFields } from '~/api/session_user';
import { optional_turnstile_token_schema, requireTurnstileIfGuest } from '~/api/turnstile_guard';
import {
  get_stats_data_input_schema,
  get_top_puzzles_input_schema,
  get_top_users_input_schema,
  get_user_list_input_schema
} from '~/api/stats_query_schema';
import { escapeIlikeToken } from '~/util/puzzle/search';

const submit_stats_route = publicProcedure
  .input(
    z.object({
      turnstile_token: optional_turnstile_token_schema,
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
  .mutation(({ input, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const { turnstile_token, info } = input;
        yield* requireTurnstileIfGuest(turnstile_token, ctx.user);

        const {
          puzzle_id,
          time_taken,
          accuracy,
          correct_attempts,
          total_attempts,
          session_id,
          practice_mode
        } = info;

        const session = yield* dbRunHttp('padavali_stats.find_session', (client) =>
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
          yield* dbRunHttp('padavali_stats.mark_practice_session', async (client) => {
            await client
              .update(padavali_sessions)
              .set({ practice_mode: true })
              .where(eq(padavali_sessions.id, session_id));
          });
        }

        yield* dbRunHttp('padavali_stats.insert_gameplay_stat', async (client) => {
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
      turnstile_token: optional_turnstile_token_schema,
      id: z.number().int(),
      location: location_list_enum,
      script: script_list_enum,
      practice_mode: z.boolean().default(false),
      /** Stable per browser play attempt — dedupes spammy start calls. */
      client_play_id: z.string().uuid()
    })
  )
  .mutation(
    ({ input: { turnstile_token, id, location, script, practice_mode, client_play_id }, ctx }) =>
      runTrpcEffect(
        Effect.gen(function* () {
          const claim = yield* claimPlaySession('padavali', client_play_id);
          if (claim.status === 'existing') {
            return { success: true, session_id: claim.sessionId };
          }

          yield* requireTurnstileIfGuest(turnstile_token, ctx.user).pipe(
            Effect.tapError(() => releasePlaySessionClaim('padavali', client_play_id))
          );

          const userFields = sessionUserFields(ctx.user);
          const inserted_sessions = yield* dbRunHttp('padavali_stats.create_session', (client) =>
            client
              .insert(padavali_sessions)
              .values({
                puzzle_id: id,
                location,
                script,
                practice_mode,
                user_id: userFields.user_id,
                user_name: userFields.user_name
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
      turnstile_token: optional_turnstile_token_schema,
      session_id: z.number().int(),
      practice_mode: z.boolean()
    })
  )
  .mutation(({ input: { turnstile_token, session_id, practice_mode }, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* requireTurnstileIfGuest(turnstile_token, ctx.user);

        yield* dbRunHttp('padavali_stats.update_session_practice_mode', async (client) => {
          await client
            .update(padavali_sessions)
            .set({ practice_mode })
            .where(eq(padavali_sessions.id, session_id));
        });

        return { success: true };
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
          sessions: dbRunHttp('padavali_stats.list_sessions', (client) =>
            client.query.padavali_sessions.findMany({
              columns: {
                id: true,
                created_at: true,
                practice_mode: true,
                location: true,
                script: true,
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
          stats: dbRunHttp('padavali_stats.list_gameplay_stats', async (client) => {
            if (filterByUsers) {
              const conditions = [inArray(padavali_sessions.user_id, selectedUserIds)];
              if (puzzle_ids && puzzle_ids.length > 0) {
                conditions.push(inArray(padavali_gameplay_stats.puzzle_id, puzzle_ids));
              }
              if (!all_time && start_date && end_date) {
                conditions.push(gte(padavali_gameplay_stats.created_at, start_date));
                conditions.push(lte(padavali_gameplay_stats.created_at, end_date));
              }
              return client
                .select({
                  id: padavali_gameplay_stats.id,
                  created_at: padavali_gameplay_stats.created_at,
                  session_id: padavali_gameplay_stats.session_id,
                  time_taken: padavali_gameplay_stats.time_taken,
                  accuracy: padavali_gameplay_stats.accuracy,
                  correct_attempts: padavali_gameplay_stats.correct_attempts,
                  total_attempts: padavali_gameplay_stats.total_attempts
                })
                .from(padavali_gameplay_stats)
                .innerJoin(
                  padavali_sessions,
                  eq(padavali_gameplay_stats.session_id, padavali_sessions.id)
                )
                .where(and(...conditions));
            }

            return client.query.padavali_gameplay_stats.findMany({
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
            });
          }),
          puzzles: dbRunHttp('padavali_stats.list_puzzles_for_word_count', (client) =>
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

        const topSessions = yield* dbRunHttp('padavali_stats.get_top_sessions', (client) =>
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

        const completionRows = yield* dbRunHttp(
          'padavali_stats.get_top_completion_counts',
          (client) =>
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

const get_top_users_route = protectedAdminProcedure
  .input(get_top_users_input_schema)
  .query(({ input: { all_time, start_date, end_date, limit, puzzle_ids } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const conditions = [isNotNull(padavali_sessions.user_id)];
        if (!all_time && start_date && end_date) {
          conditions.push(gte(padavali_sessions.created_at, start_date));
          conditions.push(lte(padavali_sessions.created_at, end_date));
        }
        if (puzzle_ids && puzzle_ids.length > 0) {
          conditions.push(inArray(padavali_sessions.puzzle_id, puzzle_ids));
        }

        const topSessions = yield* dbRunHttp('padavali_stats.get_top_users', (client) =>
          client
            .select({
              user_id: padavali_sessions.user_id,
              name: max(padavali_sessions.user_name),
              started: count()
            })
            .from(padavali_sessions)
            .where(and(...conditions))
            .groupBy(padavali_sessions.user_id)
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
        const statsConditions = [inArray(padavali_sessions.user_id, userIds)];
        if (!all_time && start_date && end_date) {
          statsConditions.push(gte(padavali_gameplay_stats.created_at, start_date));
          statsConditions.push(lte(padavali_gameplay_stats.created_at, end_date));
        }
        if (puzzle_ids && puzzle_ids.length > 0) {
          statsConditions.push(inArray(padavali_gameplay_stats.puzzle_id, puzzle_ids));
        }

        const completionRows = yield* dbRunHttp(
          'padavali_stats.get_top_user_completions',
          (client) =>
            client
              .select({
                user_id: padavali_sessions.user_id,
                completed: count()
              })
              .from(padavali_gameplay_stats)
              .innerJoin(
                padavali_sessions,
                eq(padavali_gameplay_stats.session_id, padavali_sessions.id)
              )
              .where(and(...statsConditions))
              .groupBy(padavali_sessions.user_id)
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
        const conditions = [isNotNull(padavali_sessions.user_id)];
        if (trimmedSearch) {
          const pattern = `%${escapeIlikeToken(trimmedSearch)}%`;
          conditions.push(
            or(
              ilike(padavali_sessions.user_name, pattern),
              ilike(padavali_sessions.user_id, pattern)
            )!
          );
        }
        const whereClause = and(...conditions);
        const offset = (page - 1) * size;

        const { countResult, rows } = yield* Effect.all({
          countResult: dbRunHttp('padavali_stats.count_users', (client) =>
            client
              .select({
                count: sql<number>`cast(count(distinct ${padavali_sessions.user_id}) as int)`
              })
              .from(padavali_sessions)
              .where(whereClause)
          ),
          rows: dbRunHttp('padavali_stats.list_users', (client) =>
            client
              .select({
                user_id: padavali_sessions.user_id,
                name: max(padavali_sessions.user_name),
                plays: count()
              })
              .from(padavali_sessions)
              .where(whereClause)
              .groupBy(padavali_sessions.user_id)
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

export const padavali_stats_router = t.router({
  submit_stats: submit_stats_route,
  update_games_started: update_games_started_route,
  update_session_practice_mode: update_session_practice_mode_route,
  get_stats_data: get_stats_data_route,
  get_top_puzzles: get_top_puzzles_route,
  get_top_users: get_top_users_route,
  get_user_list_page: get_user_list_page_route
});

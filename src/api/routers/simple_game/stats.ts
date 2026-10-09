import { Effect } from 'effect';
import { protectedAdminProcedure, publicProcedure, t } from '../../trpc_init';
import { dbRunHttp } from '~/effect/database';
import { and, count, desc, eq, gte, ilike, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import {
  simple_game_submit_stats_input_schema,
  simple_game_update_games_started_input_schema
} from '~/db/simple_game_shared';
import { BadRequestError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import {
  claimPlaySession,
  completePlaySession,
  releasePlaySessionClaim
} from '~/api/routers/stats_play_guard';
import { displayUserName, sessionUserFields } from '~/api/routers/user/session_user';
import { resolveAuthUserNames, searchAuthUsers } from '~/lib/auth_users.server';
import { requireTurnstileIfGuest } from '~/api/routers/turnstile_guard';
import {
  get_stats_data_input_schema,
  get_top_puzzles_input_schema,
  get_top_users_input_schema,
  get_user_list_input_schema
} from '~/api/routers/stats_query_schema';
import { escapeIlikeToken } from '~/util/puzzle/search';
import type { SimpleGameKind } from '~/util/games/kinds';
import type { SimpleGameTableSet } from '~/db/schema/simple_game_tables';
import type { ScriptType } from '~/state/script_list';

export function createSimpleGameStatsRouter<TData>(
  kind: SimpleGameKind,
  tables: SimpleGameTableSet<TData>
) {
  const submit_stats_route = publicProcedure
    .input(simple_game_submit_stats_input_schema)
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
            session_id
          } = info;

          const [session] = yield* dbRunHttp(`${kind}_stats.find_session`, (client) =>
            client
              .select({ id: tables.sessions.id })
              .from(tables.sessions)
              .where(
                and(eq(tables.sessions.id, session_id), eq(tables.sessions.puzzle_id, puzzle_id))
              )
              .limit(1)
          );
          if (!session) {
            return yield* Effect.fail(
              BadRequestError.make({ message: 'Invalid session for puzzle' })
            );
          }

          yield* dbRunHttp(`${kind}_stats.insert_gameplay_stat`, async (client) => {
            await client
              .insert(tables.gameplay_stats)
              .values({
                puzzle_id,
                session_id,
                time_taken,
                accuracy,
                correct_attempts,
                total_attempts
              })
              .onConflictDoNothing({ target: tables.gameplay_stats.session_id });
          });

          return { submitted: true };
        })
      )
    );

  const update_games_started_route = publicProcedure
    .input(simple_game_update_games_started_input_schema)
    .mutation(({ input: { turnstile_token, id, location, script, client_play_id }, ctx }) =>
      runTrpcEffect(
        Effect.gen(function* () {
          const claim = yield* claimPlaySession(kind, client_play_id);
          if (claim.status === 'existing') {
            return { success: true, session_id: claim.sessionId };
          }

          yield* requireTurnstileIfGuest(turnstile_token, ctx.user).pipe(
            Effect.tapError(() => releasePlaySessionClaim(kind, client_play_id))
          );

          const userFields = sessionUserFields(ctx.user);
          const inserted_sessions = yield* dbRunHttp(`${kind}_stats.create_session`, (client) =>
            client
              .insert(tables.sessions)
              .values({
                puzzle_id: id,
                location,
                script: script as ScriptType | undefined,
                user_id: userFields.user_id
              })
              .returning()
          ).pipe(Effect.tapError(() => releasePlaySessionClaim(kind, client_play_id)));
          const session = inserted_sessions[0];
          if (!session) {
            yield* releasePlaySessionClaim(kind, client_play_id);
            return yield* Effect.fail(
              BadRequestError.make({ message: 'Failed to create session' })
            );
          }

          yield* completePlaySession(kind, client_play_id, session.id);
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
          const { sessions, stats } = yield* Effect.all({
            sessions: dbRunHttp(`${kind}_stats.list_sessions`, (client) => {
              const conditions = [];
              if (puzzle_ids && puzzle_ids.length > 0) {
                conditions.push(inArray(tables.sessions.puzzle_id, puzzle_ids));
              }
              if (filterByUsers) {
                conditions.push(inArray(tables.sessions.user_id, selectedUserIds));
              }
              if (!all_time && start_date && end_date) {
                conditions.push(gte(tables.sessions.created_at, start_date));
                conditions.push(lte(tables.sessions.created_at, end_date));
              }
              return client
                .select({
                  id: tables.sessions.id,
                  created_at: tables.sessions.created_at,
                  location: tables.sessions.location,
                  user_id: tables.sessions.user_id,
                  script: tables.sessions.script
                })
                .from(tables.sessions)
                .where(conditions.length > 0 ? and(...conditions) : undefined);
            }),
            stats: dbRunHttp(`${kind}_stats.list_gameplay_stats`, (client) => {
              if (filterByUsers) {
                const conditions = [inArray(tables.sessions.user_id, selectedUserIds)];
                if (puzzle_ids && puzzle_ids.length > 0) {
                  conditions.push(inArray(tables.gameplay_stats.puzzle_id, puzzle_ids));
                }
                if (!all_time && start_date && end_date) {
                  conditions.push(gte(tables.gameplay_stats.created_at, start_date));
                  conditions.push(lte(tables.gameplay_stats.created_at, end_date));
                }
                return client
                  .select({
                    id: tables.gameplay_stats.id,
                    created_at: tables.gameplay_stats.created_at,
                    session_id: tables.gameplay_stats.session_id,
                    time_taken: tables.gameplay_stats.time_taken,
                    accuracy: tables.gameplay_stats.accuracy,
                    correct_attempts: tables.gameplay_stats.correct_attempts,
                    total_attempts: tables.gameplay_stats.total_attempts
                  })
                  .from(tables.gameplay_stats)
                  .innerJoin(
                    tables.sessions,
                    eq(tables.gameplay_stats.session_id, tables.sessions.id)
                  )
                  .where(and(...conditions));
              }

              const conditions = [];
              if (puzzle_ids && puzzle_ids.length > 0) {
                conditions.push(inArray(tables.gameplay_stats.puzzle_id, puzzle_ids));
              }
              if (!all_time && start_date && end_date) {
                conditions.push(gte(tables.gameplay_stats.created_at, start_date));
                conditions.push(lte(tables.gameplay_stats.created_at, end_date));
              }
              return client
                .select({
                  id: tables.gameplay_stats.id,
                  created_at: tables.gameplay_stats.created_at,
                  session_id: tables.gameplay_stats.session_id,
                  time_taken: tables.gameplay_stats.time_taken,
                  accuracy: tables.gameplay_stats.accuracy,
                  correct_attempts: tables.gameplay_stats.correct_attempts,
                  total_attempts: tables.gameplay_stats.total_attempts
                })
                .from(tables.gameplay_stats)
                .where(conditions.length > 0 ? and(...conditions) : undefined);
            })
          });

          return { sessions, stats };
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
                  gte(tables.sessions.created_at, start_date),
                  lte(tables.sessions.created_at, end_date)
                ]
              : [];

          const topSessions = yield* dbRunHttp(`${kind}_stats.get_top_sessions`, (client) =>
            client
              .select({
                puzzle_id: tables.sessions.puzzle_id,
                title: tables.puzzles.title,
                started: count()
              })
              .from(tables.sessions)
              .innerJoin(tables.puzzles, eq(tables.puzzles.id, tables.sessions.puzzle_id))
              .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
              .groupBy(tables.sessions.puzzle_id, tables.puzzles.title)
              .orderBy(desc(count()))
              .limit(limit)
          );

          if (topSessions.length === 0) {
            return { puzzles: [] as { puzzle_id: number; title: string; started: number; completed: number }[] };
          }

          const puzzleIds = topSessions.map((row) => row.puzzle_id);
          const statsDateConditions =
            !all_time && start_date && end_date
              ? [
                  gte(tables.gameplay_stats.created_at, start_date),
                  lte(tables.gameplay_stats.created_at, end_date)
                ]
              : [];

          const completionRows = yield* dbRunHttp(`${kind}_stats.get_top_completion_counts`, (client) =>
            client
              .select({
                puzzle_id: tables.gameplay_stats.puzzle_id,
                completed: count()
              })
              .from(tables.gameplay_stats)
              .where(
                and(
                  inArray(tables.gameplay_stats.puzzle_id, puzzleIds),
                  ...(statsDateConditions.length > 0 ? statsDateConditions : [])
                )
              )
              .groupBy(tables.gameplay_stats.puzzle_id)
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
          const conditions = [isNotNull(tables.sessions.user_id)];
          if (!all_time && start_date && end_date) {
            conditions.push(gte(tables.sessions.created_at, start_date));
            conditions.push(lte(tables.sessions.created_at, end_date));
          }
          if (puzzle_ids && puzzle_ids.length > 0) {
            conditions.push(inArray(tables.sessions.puzzle_id, puzzle_ids));
          }

          const topSessions = yield* dbRunHttp(`${kind}_stats.get_top_users`, (client) =>
            client
              .select({
                user_id: tables.sessions.user_id,
                started: count()
              })
              .from(tables.sessions)
              .where(and(...conditions))
              .groupBy(tables.sessions.user_id)
              .orderBy(desc(count()))
              .limit(limit)
          );

          const userIds = topSessions.flatMap((row) => (row.user_id ? [row.user_id] : []));
          const namesById = yield* resolveAuthUserNames(userIds);

          const users = topSessions.flatMap((row) => {
            if (!row.user_id) return [];
            return [
              {
                user_id: row.user_id,
                name: namesById.get(row.user_id) ?? displayUserName(row.user_id, null),
                started: Number(row.started),
                completed: 0
              }
            ];
          });

          if (users.length === 0) {
            return { users };
          }

          const statsConditions = [inArray(tables.sessions.user_id, userIds)];
          if (!all_time && start_date && end_date) {
            statsConditions.push(gte(tables.gameplay_stats.created_at, start_date));
            statsConditions.push(lte(tables.gameplay_stats.created_at, end_date));
          }
          if (puzzle_ids && puzzle_ids.length > 0) {
            statsConditions.push(inArray(tables.gameplay_stats.puzzle_id, puzzle_ids));
          }

          const completionRows = yield* dbRunHttp(`${kind}_stats.get_top_user_completions`, (client) =>
            client
              .select({
                user_id: tables.sessions.user_id,
                completed: count()
              })
              .from(tables.gameplay_stats)
              .innerJoin(
                tables.sessions,
                eq(tables.gameplay_stats.session_id, tables.sessions.id)
              )
              .where(and(...statsConditions))
              .groupBy(tables.sessions.user_id)
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
          const offset = (page - 1) * size;

          if (trimmedSearch) {
            const authMatches = yield* searchAuthUsers(trimmedSearch, 50);
            const idPattern = `%${escapeIlikeToken(trimmedSearch)}%`;
            const localIdRows = yield* dbRunHttp(`${kind}_stats.search_user_ids`, (client) =>
              client
                .selectDistinct({ user_id: tables.sessions.user_id })
                .from(tables.sessions)
                .where(
                  and(isNotNull(tables.sessions.user_id), ilike(tables.sessions.user_id, idPattern))
                )
                .limit(50)
            );

            const matchedIds = [
              ...new Set([
                ...authMatches.map((user) => user.id),
                ...localIdRows.flatMap((row) => (row.user_id ? [row.user_id] : []))
              ])
            ];

            if (matchedIds.length === 0) {
              return {
                list: [],
                total: 0,
                page,
                pageCount: 1,
                hasPrev: false,
                hasNext: false
              };
            }

            const playRows = yield* dbRunHttp(`${kind}_stats.list_users_filtered`, (client) =>
              client
                .select({
                  user_id: tables.sessions.user_id,
                  plays: count()
                })
                .from(tables.sessions)
                .where(inArray(tables.sessions.user_id, matchedIds))
                .groupBy(tables.sessions.user_id)
                .orderBy(desc(count()))
            );

            const namesById = new Map(authMatches.map((user) => [user.id, user.name] as const));
            const missingIds = playRows.flatMap((row) =>
              row.user_id && !namesById.has(row.user_id) ? [row.user_id] : []
            );
            if (missingIds.length > 0) {
              const resolved = yield* resolveAuthUserNames(missingIds);
              for (const [id, name] of resolved) namesById.set(id, name);
            }

            const sorted = playRows.flatMap((row) => {
              if (!row.user_id) return [];
              return [
                {
                  id: row.user_id,
                  name: namesById.get(row.user_id) ?? displayUserName(row.user_id, null),
                  plays: Number(row.plays)
                }
              ];
            });

            const total = sorted.length;
            const pageCount = Math.max(1, Math.ceil(total / size));
            return {
              list: sorted.slice(offset, offset + size),
              total,
              page,
              pageCount,
              hasPrev: page > 1,
              hasNext: page < pageCount
            };
          }

          const whereClause = isNotNull(tables.sessions.user_id);
          const { countResult, rows } = yield* Effect.all({
            countResult: dbRunHttp(`${kind}_stats.count_users`, (client) =>
              client
                .select({
                  count: sql<number>`cast(count(distinct ${tables.sessions.user_id}) as int)`
                })
                .from(tables.sessions)
                .where(whereClause)
            ),
            rows: dbRunHttp(`${kind}_stats.list_users`, (client) =>
              client
                .select({
                  user_id: tables.sessions.user_id,
                  plays: count()
                })
                .from(tables.sessions)
                .where(whereClause)
                .groupBy(tables.sessions.user_id)
                .orderBy(desc(count()))
                .limit(size)
                .offset(offset)
            )
          });

          const pageIds = rows.flatMap((row) => (row.user_id ? [row.user_id] : []));
          const namesById = yield* resolveAuthUserNames(pageIds);
          const list = rows.flatMap((row) => {
            if (!row.user_id) return [];
            return [
              {
                id: row.user_id,
                name: namesById.get(row.user_id) ?? displayUserName(row.user_id, null),
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

  return t.router({
    submit_stats: submit_stats_route,
    update_games_started: update_games_started_route,
    get_stats_data: get_stats_data_route,
    get_top_puzzles: get_top_puzzles_route,
    get_top_users: get_top_users_route,
    get_user_list_page: get_user_list_page_route
  });
}

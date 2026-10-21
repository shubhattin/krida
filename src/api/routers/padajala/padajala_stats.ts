import { Effect } from 'effect';
import { protectedAdminProcedure, publicProcedure, t } from '../../trpc_init';
import { padajala_gameplay_stats, puzzle_sessions, puzzles } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { and, count, desc, eq, gte, ilike, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import {
  padajala_submit_stats_input_schema,
  padajala_update_games_started_input_schema
} from '~/db/padajala_shared';
import { BadRequestError, NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import { padajalaActiveWords } from '~/util/puzzle/word_list';
import {
  claimPlaySession,
  completePlaySession,
  releasePlaySessionClaim
} from '~/api/routers/stats_play_guard';
import { displayUserName, sessionUserFields } from '~/api/routers/user/session_user';
import { resolveAuthUserNames, searchAuthUsers } from '~/lib/auth_users.server';
import { requireTurnstileIfGuest } from '~/api/routers/turnstile_guard';
import { adoptGuestSession } from '~/api/routers/stats_session_adopt';
import {
  get_stats_data_input_schema,
  get_top_puzzles_input_schema,
  get_top_users_input_schema,
  get_user_list_input_schema
} from '~/api/routers/stats_query_schema';
import { escapeIlikeToken } from '~/util/puzzle/search';
import { CACHE, invalidate_and_refresh_cache } from '~/util/cache.server/cache_loaders';

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.catch(() => Effect.void));

const padajalaKind = eq(puzzles.kind, 'padajala');
const sessionForKind = and(eq(puzzles.id, puzzle_sessions.puzzle_id), padajalaKind);
const statForKind = and(eq(puzzles.id, padajala_gameplay_stats.puzzle_id), padajalaKind);

const submit_stats_route = publicProcedure
  .input(padajala_submit_stats_input_schema)
  .mutation(({ input, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const { turnstile_token, info } = input;
        yield* requireTurnstileIfGuest(turnstile_token, ctx.user);

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

        const [session] = yield* dbRunHttp('padajala_stats.find_session', (client) =>
          client
            .select({ id: puzzle_sessions.id })
            .from(puzzle_sessions)
            .innerJoin(puzzles, sessionForKind)
            .where(
              and(eq(puzzle_sessions.id, session_id), eq(puzzle_sessions.puzzle_id, puzzle_id))
            )
            .limit(1)
        );
        if (!session) {
          return yield* Effect.fail(
            BadRequestError.make({
              message: 'Invalid session for puzzle'
            })
          );
        }

        const inserted = yield* dbRunHttp('padajala_stats.insert_gameplay_stat', (client) =>
          client
            .insert(padajala_gameplay_stats)
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
            .onConflictDoNothing({ target: padajala_gameplay_stats.session_id })
            .returning()
        );
        if (inserted.length > 0) {
          yield* adoptGuestSession('padajala_stats.adopt_guest_session', session_id, ctx.user);
        }

        if (ctx.user?.id) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.user.padajala_dashboard, {
              userId: ctx.user.id
            })
          );
        }

        return { submitted: true };
      })
    )
  );

const update_games_started_route = publicProcedure
  .input(padajala_update_games_started_input_schema)
  .mutation(({ input: { turnstile_token, id, location, client_play_id }, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const claim = yield* claimPlaySession('padajala', client_play_id);
        if (claim.status === 'existing') {
          return { success: true, session_id: claim.sessionId };
        }

        yield* requireTurnstileIfGuest(turnstile_token, ctx.user).pipe(
          Effect.tapError(() => releasePlaySessionClaim('padajala', client_play_id))
        );

        // Sessions are shared across games now — reject ids from other kinds.
        const [puzzle] = yield* dbRunHttp('padajala_stats.find_puzzle', (client) =>
          client
            .select({ id: puzzles.id })
            .from(puzzles)
            .where(and(eq(puzzles.id, id), eq(puzzles.kind, 'padajala')))
            .limit(1)
        );
        if (!puzzle) {
          yield* releasePlaySessionClaim('padajala', client_play_id);
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'padajala_puzzle', message: 'Puzzle not found' })
          );
        }

        const userFields = sessionUserFields(ctx.user);
        const inserted_sessions = yield* dbRunHttp('padajala_stats.create_session', (client) =>
          client
            .insert(puzzle_sessions)
            .values({
              puzzle_id: id,
              location,
              user_id: userFields.user_id
            })
            .returning()
        ).pipe(Effect.tapError(() => releasePlaySessionClaim('padajala', client_play_id)));
        const session = inserted_sessions[0];
        if (!session) {
          yield* releasePlaySessionClaim('padajala', client_play_id);
          return yield* Effect.fail(
            BadRequestError.make({
              message: 'Failed to create session'
            })
          );
        }

        yield* completePlaySession('padajala', client_play_id, session.id);

        if (userFields.user_id) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.user.padajala_dashboard, {
              userId: userFields.user_id
            })
          );
        }

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
        const {
          sessions,
          stats,
          puzzles: puzzleWordRows
        } = yield* Effect.all({
          sessions: dbRunHttp('padajala_stats.list_sessions', (client) => {
            const conditions = [padajalaKind];
            if (puzzle_ids && puzzle_ids.length > 0) {
              conditions.push(inArray(puzzle_sessions.puzzle_id, puzzle_ids));
            }
            if (filterByUsers) {
              conditions.push(inArray(puzzle_sessions.user_id, selectedUserIds));
            }
            if (!all_time && start_date && end_date) {
              conditions.push(gte(puzzle_sessions.created_at, start_date));
              conditions.push(lte(puzzle_sessions.created_at, end_date));
            }
            return client
              .select({
                id: puzzle_sessions.id,
                created_at: puzzle_sessions.created_at,
                location: puzzle_sessions.location,
                user_id: puzzle_sessions.user_id
              })
              .from(puzzle_sessions)
              .innerJoin(puzzles, sessionForKind)
              .where(and(...conditions));
          }),
          stats: dbRunHttp('padajala_stats.list_gameplay_stats', async (client) => {
            const conditions = [padajalaKind];
            if (filterByUsers) {
              conditions.push(inArray(puzzle_sessions.user_id, selectedUserIds));
            }
            if (puzzle_ids && puzzle_ids.length > 0) {
              conditions.push(inArray(padajala_gameplay_stats.puzzle_id, puzzle_ids));
            }
            if (!all_time && start_date && end_date) {
              conditions.push(gte(padajala_gameplay_stats.created_at, start_date));
              conditions.push(lte(padajala_gameplay_stats.created_at, end_date));
            }
            const query = client
              .select({
                id: padajala_gameplay_stats.id,
                created_at: padajala_gameplay_stats.created_at,
                session_id: padajala_gameplay_stats.session_id,
                time_taken: padajala_gameplay_stats.time_taken,
                accuracy: padajala_gameplay_stats.accuracy,
                total_entries: padajala_gameplay_stats.total_entries,
                total_cells: padajala_gameplay_stats.total_cells,
                prefilled_cells: padajala_gameplay_stats.prefilled_cells,
                letter_inputs: padajala_gameplay_stats.letter_inputs,
                incorrect_entry_attempts: padajala_gameplay_stats.incorrect_entry_attempts
              })
              .from(padajala_gameplay_stats)
              .innerJoin(puzzles, statForKind);
            if (!filterByUsers) return query.where(and(...conditions));
            return query
              .innerJoin(
                puzzle_sessions,
                eq(padajala_gameplay_stats.session_id, puzzle_sessions.id)
              )
              .where(and(...conditions));
          }),
          puzzles: dbRunHttp('padajala_stats.list_puzzles_for_word_count', (client) =>
            client.query.padajala_puzzles.findMany({
              columns: { word_list: true },
              where:
                puzzle_ids && puzzle_ids.length > 0
                  ? (tbl, { inArray: inArrayFn }) => inArrayFn(tbl.id, puzzle_ids)
                  : undefined
            })
          )
        });

        const total_words = puzzleWordRows.reduce(
          (sum, puzzle) => sum + padajalaActiveWords(puzzle.word_list).length,
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
                gte(puzzle_sessions.created_at, start_date),
                lte(puzzle_sessions.created_at, end_date)
              ]
            : [];

        const topSessions = yield* dbRunHttp('padajala_stats.get_top_sessions', (client) =>
          client
            .select({
              puzzle_id: puzzle_sessions.puzzle_id,
              title: puzzles.title,
              started: count()
            })
            .from(puzzle_sessions)
            .innerJoin(puzzles, sessionForKind)
            .where(and(padajalaKind, ...(dateConditions.length > 0 ? dateConditions : [])))
            .groupBy(puzzle_sessions.puzzle_id, puzzles.title)
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
                gte(padajala_gameplay_stats.created_at, start_date),
                lte(padajala_gameplay_stats.created_at, end_date)
              ]
            : [];

        const completionRows = yield* dbRunHttp(
          'padajala_stats.get_top_completion_counts',
          (client) =>
            client
              .select({
                puzzle_id: padajala_gameplay_stats.puzzle_id,
                completed: count()
              })
              .from(padajala_gameplay_stats)
              .innerJoin(puzzles, statForKind)
              .where(
                and(
                  inArray(padajala_gameplay_stats.puzzle_id, puzzleIds),
                  ...(statsDateConditions.length > 0 ? statsDateConditions : [])
                )
              )
              .groupBy(padajala_gameplay_stats.puzzle_id)
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
        const conditions = [padajalaKind, isNotNull(puzzle_sessions.user_id)];
        if (!all_time && start_date && end_date) {
          conditions.push(gte(puzzle_sessions.created_at, start_date));
          conditions.push(lte(puzzle_sessions.created_at, end_date));
        }
        if (puzzle_ids && puzzle_ids.length > 0) {
          conditions.push(inArray(puzzle_sessions.puzzle_id, puzzle_ids));
        }

        const topSessions = yield* dbRunHttp('padajala_stats.get_top_users', (client) =>
          client
            .select({
              user_id: puzzle_sessions.user_id,
              started: count()
            })
            .from(puzzle_sessions)
            .innerJoin(puzzles, sessionForKind)
            .where(and(...conditions))
            .groupBy(puzzle_sessions.user_id)
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

        const statsConditions = [padajalaKind, inArray(puzzle_sessions.user_id, userIds)];
        if (!all_time && start_date && end_date) {
          statsConditions.push(gte(padajala_gameplay_stats.created_at, start_date));
          statsConditions.push(lte(padajala_gameplay_stats.created_at, end_date));
        }
        if (puzzle_ids && puzzle_ids.length > 0) {
          statsConditions.push(inArray(padajala_gameplay_stats.puzzle_id, puzzle_ids));
        }

        const completionRows = yield* dbRunHttp(
          'padajala_stats.get_top_user_completions',
          (client) =>
            client
              .select({
                user_id: puzzle_sessions.user_id,
                completed: count()
              })
              .from(padajala_gameplay_stats)
              .innerJoin(
                puzzle_sessions,
                eq(padajala_gameplay_stats.session_id, puzzle_sessions.id)
              )
              .innerJoin(puzzles, sessionForKind)
              .where(and(...statsConditions))
              .groupBy(puzzle_sessions.user_id)
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
          const localIdRows = yield* dbRunHttp('padajala_stats.search_user_ids', (client) =>
            client
              .selectDistinct({ user_id: puzzle_sessions.user_id })
              .from(puzzle_sessions)
              .innerJoin(puzzles, sessionForKind)
              .where(
                and(
                  padajalaKind,
                  isNotNull(puzzle_sessions.user_id),
                  ilike(puzzle_sessions.user_id, idPattern)
                )
              )
              .limit(50)
          );

          const matchedIds = [
            ...new Set([
              ...authMatches.map((u) => u.id),
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

          const playRows = yield* dbRunHttp('padajala_stats.list_users_filtered', (client) =>
            client
              .select({
                user_id: puzzle_sessions.user_id,
                plays: count()
              })
              .from(puzzle_sessions)
              .innerJoin(puzzles, sessionForKind)
              .where(and(padajalaKind, inArray(puzzle_sessions.user_id, matchedIds)))
              .groupBy(puzzle_sessions.user_id)
              .orderBy(desc(count()))
          );

          const namesById = new Map(authMatches.map((u) => [u.id, u.name] as const));
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
          const list = sorted.slice(offset, offset + size);

          return {
            list,
            total,
            page,
            pageCount,
            hasPrev: page > 1,
            hasNext: page < pageCount
          };
        }

        const conditions = [padajalaKind, isNotNull(puzzle_sessions.user_id)];
        const whereClause = and(...conditions);

        const { countResult, rows } = yield* Effect.all({
          countResult: dbRunHttp('padajala_stats.count_users', (client) =>
            client
              .select({
                count: sql<number>`cast(count(distinct ${puzzle_sessions.user_id}) as int)`
              })
              .from(puzzle_sessions)
              .innerJoin(puzzles, sessionForKind)
              .where(whereClause)
          ),
          rows: dbRunHttp('padajala_stats.list_users', (client) =>
            client
              .select({
                user_id: puzzle_sessions.user_id,
                plays: count()
              })
              .from(puzzle_sessions)
              .innerJoin(puzzles, sessionForKind)
              .where(whereClause)
              .groupBy(puzzle_sessions.user_id)
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

export const padajala_stats_router = t.router({
  submit_stats: submit_stats_route,
  update_games_started: update_games_started_route,
  get_stats_data: get_stats_data_route,
  get_top_puzzles: get_top_puzzles_route,
  get_top_users: get_top_users_route,
  get_user_list_page: get_user_list_page_route
});

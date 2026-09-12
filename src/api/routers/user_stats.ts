import { Effect } from 'effect';
import { and, avg, count, desc, eq, inArray, min, max } from 'drizzle-orm';
import { protectedProcedure, t } from '../trpc_init';
import {
  crossword_gameplay_stats,
  crossword_puzzles,
  crossword_sessions,
  padavali_gameplay_stats,
  padavali_puzzles,
  padavali_sessions
} from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { runTrpcEffect } from '~/effect/run';
import { get_user_dashboard_input_schema } from '~/api/stats_query_schema';
import {
  combineDashboardTotals,
  type DashboardGameId,
  type DashboardPuzzleRow,
  type DashboardRecentRow,
  type GameDashboardStats
} from '~/api/user_dashboard';

const TOP_PUZZLE_LIMIT = 5;
const RECENT_LIMIT = 5;

function toCount(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const emptyGameStats = (game: DashboardGameId): GameDashboardStats => ({
  game,
  started: 0,
  completed: 0,
  best_time_seconds: null,
  best_accuracy: null,
  avg_time_seconds: null,
  avg_accuracy: null,
  top_puzzles: [],
  recent: []
});

const loadPadavaliDashboard = Effect.fn('user_stats.padavali_dashboard')(function* (
  userId: string
) {
  // TODO: implement caching patterns for user dashboard stats
  const { startedRows, completionRows, topStarted, recentRows } = yield* Effect.all({
    startedRows: dbRunHttp('user_stats.padavali_started', (client) =>
      client
        .select({ started: count() })
        .from(padavali_sessions)
        .where(eq(padavali_sessions.user_id, userId))
    ),
    completionRows: dbRunHttp('user_stats.padavali_completions', (client) =>
      client
        .select({
          completed: count(),
          best_time_seconds: min(padavali_gameplay_stats.time_taken),
          best_accuracy: max(padavali_gameplay_stats.accuracy),
          avg_time_seconds: avg(padavali_gameplay_stats.time_taken),
          avg_accuracy: avg(padavali_gameplay_stats.accuracy)
        })
        .from(padavali_gameplay_stats)
        .innerJoin(padavali_sessions, eq(padavali_gameplay_stats.session_id, padavali_sessions.id))
        .where(eq(padavali_sessions.user_id, userId))
    ),
    topStarted: dbRunHttp('user_stats.padavali_top_started', (client) =>
      client
        .select({
          puzzle_id: padavali_sessions.puzzle_id,
          title: padavali_puzzles.title,
          slug: padavali_puzzles.slug,
          started: count()
        })
        .from(padavali_sessions)
        .innerJoin(padavali_puzzles, eq(padavali_puzzles.id, padavali_sessions.puzzle_id))
        .where(eq(padavali_sessions.user_id, userId))
        .groupBy(padavali_sessions.puzzle_id, padavali_puzzles.title, padavali_puzzles.slug)
        .orderBy(desc(count()))
        .limit(TOP_PUZZLE_LIMIT)
    ),
    recentRows: dbRunHttp('user_stats.padavali_recent', (client) =>
      client
        .select({
          puzzle_id: padavali_puzzles.id,
          title: padavali_puzzles.title,
          slug: padavali_puzzles.slug,
          time_taken: padavali_gameplay_stats.time_taken,
          accuracy: padavali_gameplay_stats.accuracy,
          created_at: padavali_gameplay_stats.created_at
        })
        .from(padavali_gameplay_stats)
        .innerJoin(padavali_sessions, eq(padavali_gameplay_stats.session_id, padavali_sessions.id))
        .innerJoin(padavali_puzzles, eq(padavali_gameplay_stats.puzzle_id, padavali_puzzles.id))
        .where(eq(padavali_sessions.user_id, userId))
        .orderBy(desc(padavali_gameplay_stats.created_at))
        .limit(RECENT_LIMIT)
    )
  });

  const completion = completionRows[0];
  let top_puzzles: DashboardPuzzleRow[] = topStarted.map((row) => ({
    puzzle_id: row.puzzle_id,
    title: row.title,
    slug: row.slug,
    started: toCount(row.started),
    completed: 0,
    best_time_seconds: null,
    best_accuracy: null
  }));

  if (top_puzzles.length > 0) {
    const puzzleIds = top_puzzles.map((row) => row.puzzle_id);
    const completionByPuzzle = yield* dbRunHttp('user_stats.padavali_top_completed', (client) =>
      client
        .select({
          puzzle_id: padavali_gameplay_stats.puzzle_id,
          completed: count(),
          best_time_seconds: min(padavali_gameplay_stats.time_taken),
          best_accuracy: max(padavali_gameplay_stats.accuracy)
        })
        .from(padavali_gameplay_stats)
        .innerJoin(padavali_sessions, eq(padavali_gameplay_stats.session_id, padavali_sessions.id))
        .where(
          and(
            eq(padavali_sessions.user_id, userId),
            inArray(padavali_gameplay_stats.puzzle_id, puzzleIds)
          )
        )
        .groupBy(padavali_gameplay_stats.puzzle_id)
    );

    const byPuzzle = new Map(
      completionByPuzzle.map((row) => [
        row.puzzle_id,
        {
          completed: toCount(row.completed),
          best_time_seconds: toNullableNumber(row.best_time_seconds),
          best_accuracy: toNullableNumber(row.best_accuracy)
        }
      ])
    );

    top_puzzles = top_puzzles.map((row) => {
      const extra = byPuzzle.get(row.puzzle_id);
      if (!extra) return row;
      return { ...row, ...extra };
    });
  }

  const recent: DashboardRecentRow[] = recentRows.map((row) => ({
    puzzle_id: row.puzzle_id,
    title: row.title,
    slug: row.slug,
    time_taken: row.time_taken,
    accuracy: row.accuracy,
    created_at: row.created_at
  }));

  return {
    game: 'padavali' as const,
    started: toCount(startedRows[0]?.started),
    completed: toCount(completion?.completed),
    best_time_seconds: toNullableNumber(completion?.best_time_seconds),
    best_accuracy: toNullableNumber(completion?.best_accuracy),
    avg_time_seconds: toNullableNumber(completion?.avg_time_seconds),
    avg_accuracy: toNullableNumber(completion?.avg_accuracy),
    top_puzzles,
    recent
  };
});

const loadCrosswordDashboard = Effect.fn('user_stats.crossword_dashboard')(function* (
  userId: string
) {
  // TODO: implement caching patterns for user dashboard stats
  const { startedRows, completionRows, topStarted, recentRows } = yield* Effect.all({
    startedRows: dbRunHttp('user_stats.crossword_started', (client) =>
      client
        .select({ started: count() })
        .from(crossword_sessions)
        .where(eq(crossword_sessions.user_id, userId))
    ),
    completionRows: dbRunHttp('user_stats.crossword_completions', (client) =>
      client
        .select({
          completed: count(),
          best_time_seconds: min(crossword_gameplay_stats.time_taken),
          best_accuracy: max(crossword_gameplay_stats.accuracy),
          avg_time_seconds: avg(crossword_gameplay_stats.time_taken),
          avg_accuracy: avg(crossword_gameplay_stats.accuracy)
        })
        .from(crossword_gameplay_stats)
        .innerJoin(
          crossword_sessions,
          eq(crossword_gameplay_stats.session_id, crossword_sessions.id)
        )
        .where(eq(crossword_sessions.user_id, userId))
    ),
    topStarted: dbRunHttp('user_stats.crossword_top_started', (client) =>
      client
        .select({
          puzzle_id: crossword_sessions.puzzle_id,
          title: crossword_puzzles.title,
          slug: crossword_puzzles.slug,
          started: count()
        })
        .from(crossword_sessions)
        .innerJoin(crossword_puzzles, eq(crossword_puzzles.id, crossword_sessions.puzzle_id))
        .where(eq(crossword_sessions.user_id, userId))
        .groupBy(crossword_sessions.puzzle_id, crossword_puzzles.title, crossword_puzzles.slug)
        .orderBy(desc(count()))
        .limit(TOP_PUZZLE_LIMIT)
    ),
    recentRows: dbRunHttp('user_stats.crossword_recent', (client) =>
      client
        .select({
          puzzle_id: crossword_puzzles.id,
          title: crossword_puzzles.title,
          slug: crossword_puzzles.slug,
          time_taken: crossword_gameplay_stats.time_taken,
          accuracy: crossword_gameplay_stats.accuracy,
          created_at: crossword_gameplay_stats.created_at
        })
        .from(crossword_gameplay_stats)
        .innerJoin(
          crossword_sessions,
          eq(crossword_gameplay_stats.session_id, crossword_sessions.id)
        )
        .innerJoin(crossword_puzzles, eq(crossword_gameplay_stats.puzzle_id, crossword_puzzles.id))
        .where(eq(crossword_sessions.user_id, userId))
        .orderBy(desc(crossword_gameplay_stats.created_at))
        .limit(RECENT_LIMIT)
    )
  });

  const completion = completionRows[0];
  let top_puzzles: DashboardPuzzleRow[] = topStarted.map((row) => ({
    puzzle_id: row.puzzle_id,
    title: row.title,
    slug: row.slug,
    started: toCount(row.started),
    completed: 0,
    best_time_seconds: null,
    best_accuracy: null
  }));

  if (top_puzzles.length > 0) {
    const puzzleIds = top_puzzles.map((row) => row.puzzle_id);
    const completionByPuzzle = yield* dbRunHttp('user_stats.crossword_top_completed', (client) =>
      client
        .select({
          puzzle_id: crossword_gameplay_stats.puzzle_id,
          completed: count(),
          best_time_seconds: min(crossword_gameplay_stats.time_taken),
          best_accuracy: max(crossword_gameplay_stats.accuracy)
        })
        .from(crossword_gameplay_stats)
        .innerJoin(
          crossword_sessions,
          eq(crossword_gameplay_stats.session_id, crossword_sessions.id)
        )
        .where(
          and(
            eq(crossword_sessions.user_id, userId),
            inArray(crossword_gameplay_stats.puzzle_id, puzzleIds)
          )
        )
        .groupBy(crossword_gameplay_stats.puzzle_id)
    );

    const byPuzzle = new Map(
      completionByPuzzle.map((row) => [
        row.puzzle_id,
        {
          completed: toCount(row.completed),
          best_time_seconds: toNullableNumber(row.best_time_seconds),
          best_accuracy: toNullableNumber(row.best_accuracy)
        }
      ])
    );

    top_puzzles = top_puzzles.map((row) => {
      const extra = byPuzzle.get(row.puzzle_id);
      if (!extra) return row;
      return { ...row, ...extra };
    });
  }

  const recent: DashboardRecentRow[] = recentRows.map((row) => ({
    puzzle_id: row.puzzle_id,
    title: row.title,
    slug: row.slug,
    time_taken: row.time_taken,
    accuracy: row.accuracy,
    created_at: row.created_at
  }));

  return {
    game: 'padajala' as const,
    started: toCount(startedRows[0]?.started),
    completed: toCount(completion?.completed),
    best_time_seconds: toNullableNumber(completion?.best_time_seconds),
    best_accuracy: toNullableNumber(completion?.best_accuracy),
    avg_time_seconds: toNullableNumber(completion?.avg_time_seconds),
    avg_accuracy: toNullableNumber(completion?.avg_accuracy),
    top_puzzles,
    recent
  };
});

const get_dashboard_route = protectedProcedure
  .input(get_user_dashboard_input_schema)
  .query(({ input: { game }, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        // TODO: implement caching patterns for user dashboard stats
        const userId = ctx.user.id;
        const includePadavali = game === 'all' || game === 'padavali';
        const includePadajala = game === 'all' || game === 'padajala';

        const [padavali, padajala] = yield* Effect.all([
          includePadavali
            ? loadPadavaliDashboard(userId)
            : Effect.succeed(emptyGameStats('padavali')),
          includePadajala
            ? loadCrosswordDashboard(userId)
            : Effect.succeed(emptyGameStats('padajala'))
        ]);

        const games = [padavali, padajala].filter((item) => {
          if (game === 'all') return true;
          return item.game === game;
        });

        return {
          totals: combineDashboardTotals(games),
          padavali,
          padajala
        };
      })
    )
  );

export const user_stats_router = t.router({
  get_dashboard: get_dashboard_route
});

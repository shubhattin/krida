import { Effect } from 'effect';
import { and, avg, count, desc, eq, inArray, max, min } from 'drizzle-orm';
import {
  crossword_gameplay_stats,
  crossword_puzzles,
  crossword_sessions,
  padavali_gameplay_stats,
  padavali_puzzles,
  padavali_sessions
} from '~/db/schema';
import {
  game_dashboard_stats_schema,
  type DashboardPuzzleRow,
  type DashboardRecentRow,
  type GameDashboardStats
} from '~/api/routers/user/user_dashboard';
import { createCache, type CacheItem } from '~/effect/cache';
import { dbRunHttp } from '~/effect/database';
import { CacheError } from '~/effect/errors';

const TOP_PUZZLE_LIMIT = 5;
const RECENT_LIMIT = 5;

export type UserDashboardParams = { userId: string };

const padavaliDashboardKey = ({ userId }: UserDashboardParams) => `user:${userId}:padavali`;
const padajalaDashboardKey = ({ userId }: UserDashboardParams) => `user:${userId}:padajala`;

/** Exported for tests — must stay aligned with createCache getKey builders below. */
export const userCacheKeys = {
  padavali_dashboard: padavaliDashboardKey,
  padajala_dashboard: padajalaDashboardKey
} as const;

const toCacheError = (operation: string, key: string) => (cause: unknown) =>
  CacheError.make({ operation, key, cause });

function toCount(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const fetchPadavaliDashboard = Effect.fn('user_cache.padavali_dashboard')(function* (
  userId: string
) {
  const { startedRows, completionRows, topStarted, recentRows } = yield* Effect.all({
    startedRows: dbRunHttp('user_cache.padavali_started', (client) =>
      client
        .select({ started: count() })
        .from(padavali_sessions)
        .where(eq(padavali_sessions.user_id, userId))
    ),
    completionRows: dbRunHttp('user_cache.padavali_completions', (client) =>
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
    topStarted: dbRunHttp('user_cache.padavali_top_started', (client) =>
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
    recentRows: dbRunHttp('user_cache.padavali_recent', (client) =>
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
    const completionByPuzzle = yield* dbRunHttp('user_cache.padavali_top_completed', (client) =>
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

const fetchPadajalaDashboard = Effect.fn('user_cache.padajala_dashboard')(function* (
  userId: string
) {
  const { startedRows, completionRows, topStarted, recentRows } = yield* Effect.all({
    startedRows: dbRunHttp('user_cache.padajala_started', (client) =>
      client
        .select({ started: count() })
        .from(crossword_sessions)
        .where(eq(crossword_sessions.user_id, userId))
    ),
    completionRows: dbRunHttp('user_cache.padajala_completions', (client) =>
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
    topStarted: dbRunHttp('user_cache.padajala_top_started', (client) =>
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
    recentRows: dbRunHttp('user_cache.padajala_recent', (client) =>
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
    const completionByPuzzle = yield* dbRunHttp('user_cache.padajala_top_completed', (client) =>
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

const load_padavali_dashboard: CacheItem<UserDashboardParams, GameDashboardStats> = createCache({
  getKey: padavaliDashboardKey,
  schema: game_dashboard_stats_schema,
  fetch: ({ userId }) => {
    const key = padavaliDashboardKey({ userId });
    return fetchPadavaliDashboard(userId).pipe(
      Effect.mapError(toCacheError('fetchPadavaliDashboard', key))
    );
  }
});

const load_padajala_dashboard: CacheItem<UserDashboardParams, GameDashboardStats> = createCache({
  getKey: padajalaDashboardKey,
  schema: game_dashboard_stats_schema,
  fetch: ({ userId }) => {
    const key = padajalaDashboardKey({ userId });
    return fetchPadajalaDashboard(userId).pipe(
      Effect.mapError(toCacheError('fetchPadajalaDashboard', key))
    );
  }
});

export type UserCacheLoaders = {
  padavali_dashboard: CacheItem<UserDashboardParams, GameDashboardStats>;
  padajala_dashboard: CacheItem<UserDashboardParams, GameDashboardStats>;
};

export const user_cache_loaders: UserCacheLoaders = {
  padavali_dashboard: load_padavali_dashboard,
  padajala_dashboard: load_padajala_dashboard
};

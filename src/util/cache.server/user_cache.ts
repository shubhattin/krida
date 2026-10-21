import { Effect } from 'effect';
import { and, avg, count, desc, eq, inArray, max, min } from 'drizzle-orm';
import {
  attempt_gameplay_stats,
  padajala_gameplay_stats,
  puzzle_sessions,
  puzzles
} from '~/db/schema';
import type { GameKind } from '~/util/catalog/tags';
import type { SimpleGameKind } from '~/util/games/kinds';
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

const dashboardKey =
  (kind: GameKind) =>
  ({ userId }: UserDashboardParams) =>
    `user:${userId}:${kind}`;

const padavaliDashboardKey = dashboardKey('padavali');
const padajalaDashboardKey = dashboardKey('padajala');

/** Exported for tests — must stay aligned with createCache getKey builders below. */
export const userCacheKeys = {
  padavali_dashboard: padavaliDashboardKey,
  padajala_dashboard: padajalaDashboardKey,
  dvayi_dashboard: dashboardKey('dvayi'),
  bhramita_dashboard: dashboardKey('bhramita'),
  surupa_dashboard: dashboardKey('surupa'),
  anveshi_dashboard: dashboardKey('anveshi')
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
  const padavaliKind = eq(puzzles.kind, 'padavali');
  const sessionJoin = and(eq(puzzles.id, puzzle_sessions.puzzle_id), padavaliKind);
  const statJoin = and(eq(puzzles.id, attempt_gameplay_stats.puzzle_id), padavaliKind);

  const { startedRows, completionRows, topStarted, recentRows } = yield* Effect.all({
    startedRows: dbRunHttp('user_cache.padavali_started', (client) =>
      client
        .select({ started: count() })
        .from(puzzle_sessions)
        .innerJoin(puzzles, sessionJoin)
        .where(eq(puzzle_sessions.user_id, userId))
    ),
    completionRows: dbRunHttp('user_cache.padavali_completions', (client) =>
      client
        .select({
          completed: count(),
          best_time_seconds: min(attempt_gameplay_stats.time_taken),
          best_accuracy: max(attempt_gameplay_stats.accuracy),
          avg_time_seconds: avg(attempt_gameplay_stats.time_taken),
          avg_accuracy: avg(attempt_gameplay_stats.accuracy)
        })
        .from(attempt_gameplay_stats)
        .innerJoin(puzzles, statJoin)
        .innerJoin(puzzle_sessions, eq(attempt_gameplay_stats.session_id, puzzle_sessions.id))
        .where(eq(puzzle_sessions.user_id, userId))
    ),
    topStarted: dbRunHttp('user_cache.padavali_top_started', (client) =>
      client
        .select({
          puzzle_id: puzzle_sessions.puzzle_id,
          title: puzzles.title,
          slug: puzzles.slug,
          started: count()
        })
        .from(puzzle_sessions)
        .innerJoin(puzzles, sessionJoin)
        .where(eq(puzzle_sessions.user_id, userId))
        .groupBy(puzzle_sessions.puzzle_id, puzzles.title, puzzles.slug)
        .orderBy(desc(count()))
        .limit(TOP_PUZZLE_LIMIT)
    ),
    recentRows: dbRunHttp('user_cache.padavali_recent', (client) =>
      client
        .select({
          puzzle_id: puzzles.id,
          title: puzzles.title,
          slug: puzzles.slug,
          time_taken: attempt_gameplay_stats.time_taken,
          accuracy: attempt_gameplay_stats.accuracy,
          created_at: attempt_gameplay_stats.created_at
        })
        .from(attempt_gameplay_stats)
        .innerJoin(puzzles, statJoin)
        .innerJoin(puzzle_sessions, eq(attempt_gameplay_stats.session_id, puzzle_sessions.id))
        .where(eq(puzzle_sessions.user_id, userId))
        .orderBy(desc(attempt_gameplay_stats.created_at))
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
          puzzle_id: attempt_gameplay_stats.puzzle_id,
          completed: count(),
          best_time_seconds: min(attempt_gameplay_stats.time_taken),
          best_accuracy: max(attempt_gameplay_stats.accuracy)
        })
        .from(attempt_gameplay_stats)
        .innerJoin(puzzles, statJoin)
        .innerJoin(puzzle_sessions, eq(attempt_gameplay_stats.session_id, puzzle_sessions.id))
        .where(
          and(
            eq(puzzle_sessions.user_id, userId),
            inArray(attempt_gameplay_stats.puzzle_id, puzzleIds)
          )
        )
        .groupBy(attempt_gameplay_stats.puzzle_id)
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
  const padajalaKind = eq(puzzles.kind, 'padajala');
  const sessionJoin = and(eq(puzzles.id, puzzle_sessions.puzzle_id), padajalaKind);
  const statJoin = and(eq(puzzles.id, padajala_gameplay_stats.puzzle_id), padajalaKind);

  const { startedRows, completionRows, topStarted, recentRows } = yield* Effect.all({
    startedRows: dbRunHttp('user_cache.padajala_started', (client) =>
      client
        .select({ started: count() })
        .from(puzzle_sessions)
        .innerJoin(puzzles, sessionJoin)
        .where(eq(puzzle_sessions.user_id, userId))
    ),
    completionRows: dbRunHttp('user_cache.padajala_completions', (client) =>
      client
        .select({
          completed: count(),
          best_time_seconds: min(padajala_gameplay_stats.time_taken),
          best_accuracy: max(padajala_gameplay_stats.accuracy),
          avg_time_seconds: avg(padajala_gameplay_stats.time_taken),
          avg_accuracy: avg(padajala_gameplay_stats.accuracy)
        })
        .from(padajala_gameplay_stats)
        .innerJoin(puzzles, statJoin)
        .innerJoin(puzzle_sessions, eq(padajala_gameplay_stats.session_id, puzzle_sessions.id))
        .where(eq(puzzle_sessions.user_id, userId))
    ),
    topStarted: dbRunHttp('user_cache.padajala_top_started', (client) =>
      client
        .select({
          puzzle_id: puzzle_sessions.puzzle_id,
          title: puzzles.title,
          slug: puzzles.slug,
          started: count()
        })
        .from(puzzle_sessions)
        .innerJoin(puzzles, sessionJoin)
        .where(eq(puzzle_sessions.user_id, userId))
        .groupBy(puzzle_sessions.puzzle_id, puzzles.title, puzzles.slug)
        .orderBy(desc(count()))
        .limit(TOP_PUZZLE_LIMIT)
    ),
    recentRows: dbRunHttp('user_cache.padajala_recent', (client) =>
      client
        .select({
          puzzle_id: puzzles.id,
          title: puzzles.title,
          slug: puzzles.slug,
          time_taken: padajala_gameplay_stats.time_taken,
          accuracy: padajala_gameplay_stats.accuracy,
          created_at: padajala_gameplay_stats.created_at
        })
        .from(padajala_gameplay_stats)
        .innerJoin(puzzles, statJoin)
        .innerJoin(puzzle_sessions, eq(padajala_gameplay_stats.session_id, puzzle_sessions.id))
        .where(eq(puzzle_sessions.user_id, userId))
        .orderBy(desc(padajala_gameplay_stats.created_at))
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
          puzzle_id: padajala_gameplay_stats.puzzle_id,
          completed: count(),
          best_time_seconds: min(padajala_gameplay_stats.time_taken),
          best_accuracy: max(padajala_gameplay_stats.accuracy)
        })
        .from(padajala_gameplay_stats)
        .innerJoin(puzzles, statJoin)
        .innerJoin(puzzle_sessions, eq(padajala_gameplay_stats.session_id, puzzle_sessions.id))
        .where(
          and(
            eq(puzzle_sessions.user_id, userId),
            inArray(padajala_gameplay_stats.puzzle_id, puzzleIds)
          )
        )
        .groupBy(padajala_gameplay_stats.puzzle_id)
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

const fetchSimpleGameDashboard = Effect.fn('user_cache.simple_dashboard')(function* (
  kind: SimpleGameKind,
  userId: string
) {
  // Simple games record completions in the shared attempt table, scoped by puzzle kind.
  const gameKind = eq(puzzles.kind, kind);
  const sessionJoin = and(eq(puzzles.id, puzzle_sessions.puzzle_id), gameKind);
  const statJoin = and(eq(puzzles.id, attempt_gameplay_stats.puzzle_id), gameKind);
  const op = (name: string) => `user_cache.${kind}_${name}`;

  const { startedRows, completionRows, topStarted, recentRows } = yield* Effect.all({
    startedRows: dbRunHttp(op('started'), (client) =>
      client
        .select({ started: count() })
        .from(puzzle_sessions)
        .innerJoin(puzzles, sessionJoin)
        .where(eq(puzzle_sessions.user_id, userId))
    ),
    completionRows: dbRunHttp(op('completions'), (client) =>
      client
        .select({
          completed: count(),
          best_time_seconds: min(attempt_gameplay_stats.time_taken),
          best_accuracy: max(attempt_gameplay_stats.accuracy),
          avg_time_seconds: avg(attempt_gameplay_stats.time_taken),
          avg_accuracy: avg(attempt_gameplay_stats.accuracy)
        })
        .from(attempt_gameplay_stats)
        .innerJoin(puzzles, statJoin)
        .innerJoin(puzzle_sessions, eq(attempt_gameplay_stats.session_id, puzzle_sessions.id))
        .where(eq(puzzle_sessions.user_id, userId))
    ),
    topStarted: dbRunHttp(op('top_started'), (client) =>
      client
        .select({
          puzzle_id: puzzle_sessions.puzzle_id,
          title: puzzles.title,
          slug: puzzles.slug,
          started: count()
        })
        .from(puzzle_sessions)
        .innerJoin(puzzles, sessionJoin)
        .where(eq(puzzle_sessions.user_id, userId))
        .groupBy(puzzle_sessions.puzzle_id, puzzles.title, puzzles.slug)
        .orderBy(desc(count()))
        .limit(TOP_PUZZLE_LIMIT)
    ),
    recentRows: dbRunHttp(op('recent'), (client) =>
      client
        .select({
          puzzle_id: puzzles.id,
          title: puzzles.title,
          slug: puzzles.slug,
          time_taken: attempt_gameplay_stats.time_taken,
          accuracy: attempt_gameplay_stats.accuracy,
          created_at: attempt_gameplay_stats.created_at
        })
        .from(attempt_gameplay_stats)
        .innerJoin(puzzles, statJoin)
        .innerJoin(puzzle_sessions, eq(attempt_gameplay_stats.session_id, puzzle_sessions.id))
        .where(eq(puzzle_sessions.user_id, userId))
        .orderBy(desc(attempt_gameplay_stats.created_at))
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
    const completionByPuzzle = yield* dbRunHttp(op('top_completed'), (client) =>
      client
        .select({
          puzzle_id: attempt_gameplay_stats.puzzle_id,
          completed: count(),
          best_time_seconds: min(attempt_gameplay_stats.time_taken),
          best_accuracy: max(attempt_gameplay_stats.accuracy)
        })
        .from(attempt_gameplay_stats)
        .innerJoin(puzzles, statJoin)
        .innerJoin(puzzle_sessions, eq(attempt_gameplay_stats.session_id, puzzle_sessions.id))
        .where(
          and(
            eq(puzzle_sessions.user_id, userId),
            inArray(attempt_gameplay_stats.puzzle_id, puzzleIds)
          )
        )
        .groupBy(attempt_gameplay_stats.puzzle_id)
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
    game: kind,
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
  dvayi_dashboard: CacheItem<UserDashboardParams, GameDashboardStats>;
  bhramita_dashboard: CacheItem<UserDashboardParams, GameDashboardStats>;
  surupa_dashboard: CacheItem<UserDashboardParams, GameDashboardStats>;
  anveshi_dashboard: CacheItem<UserDashboardParams, GameDashboardStats>;
};

const makeSimpleDashboardLoader = (
  kind: SimpleGameKind
): CacheItem<UserDashboardParams, GameDashboardStats> =>
  createCache({
    getKey: dashboardKey(kind),
    schema: game_dashboard_stats_schema,
    fetch: ({ userId }) => {
      const key = dashboardKey(kind)({ userId });
      return fetchSimpleGameDashboard(kind, userId).pipe(
        Effect.mapError(toCacheError(`fetch${kind}Dashboard`, key))
      );
    }
  });

export const user_cache_loaders: UserCacheLoaders = {
  padavali_dashboard: load_padavali_dashboard,
  padajala_dashboard: load_padajala_dashboard,
  dvayi_dashboard: makeSimpleDashboardLoader('dvayi'),
  bhramita_dashboard: makeSimpleDashboardLoader('bhramita'),
  surupa_dashboard: makeSimpleDashboardLoader('surupa'),
  anveshi_dashboard: makeSimpleDashboardLoader('anveshi')
};

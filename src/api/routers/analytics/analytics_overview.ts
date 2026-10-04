import { Effect } from 'effect';
import { and, count, gte, isNotNull, lte, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  crossword_gameplay_stats,
  crossword_sessions,
  padavali_gameplay_stats,
  padavali_sessions
} from '~/db/schema';
import { dbRunHttp } from '~/effect/database';

export type AdminAnalyticsGameId = 'padavali' | 'padajala';

/** One game row of the cross-game admin overview. */
export type AdminAnalyticsGameRow = {
  game: AdminAnalyticsGameId;
  /** Play sessions started in the range. */
  started: number;
  /** Gameplay stat rows written in the range (one per finished game). */
  completed: number;
  completion_rate: number;
  /** Distinct players with a signed-in session in the range. */
  signed_in_users: number;
  /** Players whose first ever signed-in session landed in the range. */
  new_signed_in_users: number;
};

export type AdminAnalyticsTotals = Omit<AdminAnalyticsGameRow, 'game'>;

export type AdminAnalyticsOverview = {
  /** One row per selected game, in Padāvalī → Padajāla order. */
  games: AdminAnalyticsGameRow[];
  /** Sum of the selected game rows; user counts are unioned, not summed. */
  totals: AdminAnalyticsTotals;
};

export type AdminAnalyticsQuery = {
  all_time: boolean;
  start_date?: Date;
  end_date?: Date;
};

type FirstSeenRow = { user_id: string | null; first_seen: Date | string | null };

type UserSignals = {
  active_user_ids: string[];
  /** user id → epoch ms of their earliest signed-in session in that game. */
  first_seen_by_user: Map<string, number>;
};

type GameQueryResult = {
  started: number;
  completed: number;
  signals: UserSignals;
};

const ADMIN_ANALYTICS_GAME_ORDER = ['padavali', 'padajala'] as const;

function rangeConditions(column: AnyPgColumn, query: AdminAnalyticsQuery): SQL[] {
  if (query.all_time) return [];
  const { start_date, end_date } = query;
  if (!start_date || !end_date) return [];
  return [gte(column, start_date), lte(column, end_date)];
}

function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toFirstSeenMap(rows: FirstSeenRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.user_id || !row.first_seen) continue;
    const firstSeen = new Date(row.first_seen).getTime();
    if (!Number.isFinite(firstSeen)) continue;
    map.set(row.user_id, firstSeen);
  }
  return map;
}

function countNewUsers(firstSeenByUser: Map<string, number>, query: AdminAnalyticsQuery): number {
  const { all_time, start_date, end_date } = query;
  if (all_time) return firstSeenByUser.size;
  if (!start_date || !end_date) return 0;

  const start = start_date.getTime();
  const end = end_date.getTime();
  let newUsers = 0;
  for (const firstSeen of firstSeenByUser.values()) {
    if (firstSeen >= start && firstSeen <= end) newUsers += 1;
  }
  return newUsers;
}

/** Union of two games' user signals — a player active in both counts once. */
function mergeUserSignals(a: UserSignals, b: UserSignals): UserSignals {
  const first_seen_by_user = new Map(a.first_seen_by_user);
  for (const [userId, firstSeen] of b.first_seen_by_user) {
    const existing = first_seen_by_user.get(userId);
    if (existing == null || firstSeen < existing) first_seen_by_user.set(userId, firstSeen);
  }

  return {
    active_user_ids: [...new Set([...a.active_user_ids, ...b.active_user_ids])],
    first_seen_by_user
  };
}

function completionRate(started: number, completed: number): number {
  return started > 0 ? Math.round((completed / started) * 100) : 0;
}

function buildGameRow(
  game: AdminAnalyticsGameId,
  result: GameQueryResult,
  query: AdminAnalyticsQuery
): AdminAnalyticsGameRow {
  return {
    game,
    started: result.started,
    completed: result.completed,
    completion_rate: completionRate(result.started, result.completed),
    signed_in_users: new Set(result.signals.active_user_ids).size,
    new_signed_in_users: countNewUsers(result.signals.first_seen_by_user, query)
  };
}

function buildTotals(
  games: AdminAnalyticsGameRow[],
  signals: UserSignals,
  query: AdminAnalyticsQuery
): AdminAnalyticsTotals {
  const started = games.reduce((sum, row) => sum + row.started, 0);
  const completed = games.reduce((sum, row) => sum + row.completed, 0);

  return {
    started,
    completed,
    completion_rate: completionRate(started, completed),
    signed_in_users: new Set(signals.active_user_ids).size,
    new_signed_in_users: countNewUsers(signals.first_seen_by_user, query)
  };
}

const fetchPadavaliGameStats = Effect.fn('analytics.padavali_game_stats')(function* (
  query: AdminAnalyticsQuery
) {
  const sessionConditions = rangeConditions(padavali_sessions.created_at, query);
  const statsConditions = rangeConditions(padavali_gameplay_stats.created_at, query);

  const { startedRows, completedRows, activeRows, firstSeenRows } = yield* Effect.all({
    startedRows: dbRunHttp('analytics.padavali_started', (client) =>
      client
        .select({ started: count() })
        .from(padavali_sessions)
        .where(sessionConditions.length > 0 ? and(...sessionConditions) : undefined)
    ),
    completedRows: dbRunHttp('analytics.padavali_completed', (client) =>
      client
        .select({ completed: count() })
        .from(padavali_gameplay_stats)
        .where(statsConditions.length > 0 ? and(...statsConditions) : undefined)
    ),
    activeRows: dbRunHttp('analytics.padavali_active_users', (client) =>
      client
        .selectDistinct({ user_id: padavali_sessions.user_id })
        .from(padavali_sessions)
        .where(and(isNotNull(padavali_sessions.user_id), ...sessionConditions))
    ),
    firstSeenRows: dbRunHttp('analytics.padavali_first_seen', (client) =>
      client
        .select({
          user_id: padavali_sessions.user_id,
          first_seen: sql<Date>`min(${padavali_sessions.created_at})`
        })
        .from(padavali_sessions)
        .where(isNotNull(padavali_sessions.user_id))
        .groupBy(padavali_sessions.user_id)
    )
  });

  return {
    started: toCount(startedRows[0]?.started),
    completed: toCount(completedRows[0]?.completed),
    signals: {
      active_user_ids: activeRows.flatMap((row) => (row.user_id ? [row.user_id] : [])),
      first_seen_by_user: toFirstSeenMap(firstSeenRows)
    }
  } satisfies GameQueryResult;
});

const fetchPadajalaGameStats = Effect.fn('analytics.padajala_game_stats')(function* (
  query: AdminAnalyticsQuery
) {
  const sessionConditions = rangeConditions(crossword_sessions.created_at, query);
  const statsConditions = rangeConditions(crossword_gameplay_stats.created_at, query);

  const { startedRows, completedRows, activeRows, firstSeenRows } = yield* Effect.all({
    startedRows: dbRunHttp('analytics.padajala_started', (client) =>
      client
        .select({ started: count() })
        .from(crossword_sessions)
        .where(sessionConditions.length > 0 ? and(...sessionConditions) : undefined)
    ),
    completedRows: dbRunHttp('analytics.padajala_completed', (client) =>
      client
        .select({ completed: count() })
        .from(crossword_gameplay_stats)
        .where(statsConditions.length > 0 ? and(...statsConditions) : undefined)
    ),
    activeRows: dbRunHttp('analytics.padajala_active_users', (client) =>
      client
        .selectDistinct({ user_id: crossword_sessions.user_id })
        .from(crossword_sessions)
        .where(and(isNotNull(crossword_sessions.user_id), ...sessionConditions))
    ),
    firstSeenRows: dbRunHttp('analytics.padajala_first_seen', (client) =>
      client
        .select({
          user_id: crossword_sessions.user_id,
          first_seen: sql<Date>`min(${crossword_sessions.created_at})`
        })
        .from(crossword_sessions)
        .where(isNotNull(crossword_sessions.user_id))
        .groupBy(crossword_sessions.user_id)
    )
  });

  return {
    started: toCount(startedRows[0]?.started),
    completed: toCount(completedRows[0]?.completed),
    signals: {
      active_user_ids: activeRows.flatMap((row) => (row.user_id ? [row.user_id] : [])),
      first_seen_by_user: toFirstSeenMap(firstSeenRows)
    }
  } satisfies GameQueryResult;
});

/** Empty signals — used when a game filter excludes one of the two games. */
const EMPTY_SIGNALS: UserSignals = { active_user_ids: [], first_seen_by_user: new Map() };

/**
 * Cross-game admin overview: started / completed counts plus signed-in and
 * newly signed-in player counts, scoped to one or both games.
 */
export const fetchAdminAnalyticsOverview = Effect.fn('analytics.overview')(function* (
  query: AdminAnalyticsQuery,
  selectedGames: AdminAnalyticsGameId[]
) {
  const [padavali, padajala] = yield* Effect.all([
    selectedGames.includes('padavali') ? fetchPadavaliGameStats(query) : Effect.succeed(null),
    selectedGames.includes('padajala') ? fetchPadajalaGameStats(query) : Effect.succeed(null)
  ]);

  const results: { game: AdminAnalyticsGameId; result: GameQueryResult }[] = [];
  if (padavali) results.push({ game: 'padavali', result: padavali });
  if (padajala) results.push({ game: 'padajala', result: padajala });

  const games = ADMIN_ANALYTICS_GAME_ORDER.flatMap((game) => {
    const entry = results.find((item) => item.game === game);
    return entry ? [buildGameRow(entry.game, entry.result, query)] : [];
  });

  const signals = results.reduce<UserSignals>(
    (merged, entry) => mergeUserSignals(merged, entry.result.signals),
    EMPTY_SIGNALS
  );

  return { games, totals: buildTotals(games, signals, query) };
});

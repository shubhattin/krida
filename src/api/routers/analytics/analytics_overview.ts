import { Effect } from 'effect';
import { and, count, gte, isNotNull, lte, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, AnyPgTable } from 'drizzle-orm/pg-core';
import {
  anveshi_gameplay_stats,
  anveshi_sessions,
  bhramita_gameplay_stats,
  bhramita_sessions,
  crossword_gameplay_stats,
  crossword_sessions,
  dvayi_gameplay_stats,
  dvayi_sessions,
  padavali_gameplay_stats,
  padavali_sessions,
  surupa_gameplay_stats,
  surupa_sessions
} from '~/db/schema';
import { dbRunHttp } from '~/effect/database';

export type AdminAnalyticsGameId =
  | 'padavali'
  | 'padajala'
  | 'dvayi'
  | 'bhramita'
  | 'surupa'
  | 'anveshi';

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

type SessionTable = AnyPgTable & {
  created_at: AnyPgColumn;
  user_id: AnyPgColumn;
};

type StatsTable = AnyPgTable & {
  created_at: AnyPgColumn;
};

export const ADMIN_ANALYTICS_GAME_ORDER = [
  'padavali',
  'padajala',
  'dvayi',
  'bhramita',
  'surupa',
  'anveshi'
] as const satisfies readonly AdminAnalyticsGameId[];

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

const fetchTableStats = Effect.fn('analytics.table_game_stats')(function* (
  label: string,
  sessions: SessionTable,
  gameplay_stats: StatsTable,
  query: AdminAnalyticsQuery
) {
  const sessionConditions = rangeConditions(sessions.created_at, query);
  const statsConditions = rangeConditions(gameplay_stats.created_at, query);

  const { startedRows, completedRows, activeRows, firstSeenRows } = yield* Effect.all({
    startedRows: dbRunHttp(`analytics.${label}_started`, (client) =>
      client
        .select({ started: count() })
        .from(sessions)
        .where(sessionConditions.length > 0 ? and(...sessionConditions) : undefined)
    ),
    completedRows: dbRunHttp(`analytics.${label}_completed`, (client) =>
      client
        .select({ completed: count() })
        .from(gameplay_stats)
        .where(statsConditions.length > 0 ? and(...statsConditions) : undefined)
    ),
    activeRows: dbRunHttp(`analytics.${label}_active_users`, (client) =>
      client
        .selectDistinct({ user_id: sessions.user_id })
        .from(sessions)
        .where(and(isNotNull(sessions.user_id), ...sessionConditions))
    ),
    firstSeenRows: dbRunHttp(`analytics.${label}_first_seen`, (client) =>
      client
        .select({
          user_id: sessions.user_id,
          first_seen: sql<Date>`min(${sessions.created_at})`
        })
        .from(sessions)
        .where(isNotNull(sessions.user_id))
        .groupBy(sessions.user_id)
    )
  });

  return {
    started: toCount(startedRows[0]?.started),
    completed: toCount(completedRows[0]?.completed),
    signals: {
      active_user_ids: activeRows.flatMap((row) => (row.user_id ? [String(row.user_id)] : [])),
      first_seen_by_user: toFirstSeenMap(
        firstSeenRows.map((row) => ({
          user_id: row.user_id ? String(row.user_id) : null,
          first_seen: row.first_seen
        }))
      )
    }
  } satisfies GameQueryResult;
});

const GAME_TABLES = {
  padavali: { label: 'padavali', sessions: padavali_sessions, stats: padavali_gameplay_stats },
  padajala: { label: 'padajala', sessions: crossword_sessions, stats: crossword_gameplay_stats },
  dvayi: { label: 'dvayi', sessions: dvayi_sessions, stats: dvayi_gameplay_stats },
  bhramita: { label: 'bhramita', sessions: bhramita_sessions, stats: bhramita_gameplay_stats },
  surupa: { label: 'surupa', sessions: surupa_sessions, stats: surupa_gameplay_stats },
  anveshi: { label: 'anveshi', sessions: anveshi_sessions, stats: anveshi_gameplay_stats }
} as const;

const EMPTY_SIGNALS: UserSignals = { active_user_ids: [], first_seen_by_user: new Map() };

/**
 * Cross-game admin overview: started / completed counts plus signed-in and
 * newly signed-in player counts, scoped to the selected games.
 */
export const fetchAdminAnalyticsOverview = Effect.fn('analytics.overview')(function* (
  query: AdminAnalyticsQuery,
  selectedGames: AdminAnalyticsGameId[]
) {
  const selected = new Set(selectedGames);
  const ordered = ADMIN_ANALYTICS_GAME_ORDER.filter((game) => selected.has(game));

  const fetched = yield* Effect.all(
    ordered.map((game) => {
      const tables = GAME_TABLES[game];
      return fetchTableStats(tables.label, tables.sessions, tables.stats, query).pipe(
        Effect.map((result) => ({ game, result }))
      );
    }),
    { concurrency: 'unbounded' }
  );

  const games = fetched.map((entry) => buildGameRow(entry.game, entry.result, query));
  const signals = fetched.reduce<UserSignals>(
    (merged, entry) => mergeUserSignals(merged, entry.result.signals),
    EMPTY_SIGNALS
  );

  return { games, totals: buildTotals(games, signals, query) };
});

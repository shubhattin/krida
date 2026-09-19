import { z } from 'zod';

export type DashboardGameId = 'padavali' | 'padajala';

export const dashboard_puzzle_row_schema = z.object({
  puzzle_id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  started: z.number(),
  completed: z.number(),
  best_time_seconds: z.number().nullable(),
  best_accuracy: z.number().nullable()
});

export const dashboard_recent_row_schema = z.object({
  puzzle_id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  time_taken: z.number(),
  accuracy: z.number(),
  created_at: z.coerce.date()
});

export const game_dashboard_stats_schema = z.object({
  game: z.enum(['padavali', 'padajala']),
  started: z.number(),
  completed: z.number(),
  best_time_seconds: z.number().nullable(),
  best_accuracy: z.number().nullable(),
  avg_time_seconds: z.number().nullable(),
  avg_accuracy: z.number().nullable(),
  top_puzzles: dashboard_puzzle_row_schema.array(),
  recent: dashboard_recent_row_schema.array()
});

export type DashboardPuzzleRow = z.infer<typeof dashboard_puzzle_row_schema>;
export type DashboardRecentRow = z.infer<typeof dashboard_recent_row_schema>;
export type GameDashboardStats = z.infer<typeof game_dashboard_stats_schema>;

export const emptyGameStats = (game: DashboardGameId): GameDashboardStats => ({
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

export type CombinedDashboardTotals = {
  started: number;
  completed: number;
  completion_rate: number;
  best_time_seconds: number | null;
  best_accuracy: number | null;
};

export function combineDashboardTotals(games: GameDashboardStats[]): CombinedDashboardTotals {
  let started = 0;
  let completed = 0;
  let best_time_seconds: number | null = null;
  let best_accuracy: number | null = null;

  for (const game of games) {
    started += game.started;
    completed += game.completed;
    if (
      game.best_time_seconds != null &&
      (best_time_seconds == null || game.best_time_seconds < best_time_seconds)
    ) {
      best_time_seconds = game.best_time_seconds;
    }
    if (
      game.best_accuracy != null &&
      (best_accuracy == null || game.best_accuracy > best_accuracy)
    ) {
      best_accuracy = game.best_accuracy;
    }
  }

  return {
    started,
    completed,
    completion_rate: started > 0 ? Math.round((completed / started) * 100) : 0,
    best_time_seconds,
    best_accuracy
  };
}

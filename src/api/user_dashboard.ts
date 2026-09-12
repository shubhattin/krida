export type DashboardGameId = 'padavali' | 'padajala';

export type DashboardPuzzleRow = {
  puzzle_id: number;
  title: string;
  slug: string;
  started: number;
  completed: number;
  best_time_seconds: number | null;
  best_accuracy: number | null;
};

export type DashboardRecentRow = {
  puzzle_id: number;
  title: string;
  slug: string;
  time_taken: number;
  accuracy: number;
  created_at: Date;
};

export type GameDashboardStats = {
  game: DashboardGameId;
  started: number;
  completed: number;
  best_time_seconds: number | null;
  best_accuracy: number | null;
  avg_time_seconds: number | null;
  avg_accuracy: number | null;
  top_puzzles: DashboardPuzzleRow[];
  recent: DashboardRecentRow[];
};

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

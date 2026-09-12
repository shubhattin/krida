import { describe, expect, it } from 'vitest';
import { combineDashboardTotals, type GameDashboardStats } from './user_dashboard';

const emptyGame = (game: GameDashboardStats['game']): GameDashboardStats => ({
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

describe('combineDashboardTotals', () => {
  it('sums plays and keeps the best time and accuracy', () => {
    const padavali: GameDashboardStats = {
      ...emptyGame('padavali'),
      started: 4,
      completed: 2,
      best_time_seconds: 90,
      best_accuracy: 80
    };
    const padajala: GameDashboardStats = {
      ...emptyGame('padajala'),
      started: 1,
      completed: 1,
      best_time_seconds: 40,
      best_accuracy: 95
    };

    expect(combineDashboardTotals([padavali, padajala])).toEqual({
      started: 5,
      completed: 3,
      completion_rate: 60,
      best_time_seconds: 40,
      best_accuracy: 95
    });
  });

  it('returns zeros when there is no play history', () => {
    expect(combineDashboardTotals([emptyGame('padavali'), emptyGame('padajala')])).toEqual({
      started: 0,
      completed: 0,
      completion_rate: 0,
      best_time_seconds: null,
      best_accuracy: null
    });
  });
});

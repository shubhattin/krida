import { describe, expect, it } from 'vitest';
import { canSubmitPlayMetrics, playMetricsToken } from './play_metrics_auth';

describe('canSubmitPlayMetrics', () => {
  it('waits until the session query has settled', () => {
    expect(canSubmitPlayMetrics(false, true, null)).toBe(false);
    expect(canSubmitPlayMetrics(false, false, 'tok')).toBe(false);
  });

  it('allows signed-in players without a token', () => {
    expect(canSubmitPlayMetrics(true, true, null)).toBe(true);
  });

  it('blocks guests until a token exists', () => {
    expect(canSubmitPlayMetrics(true, false, null)).toBe(false);
    expect(canSubmitPlayMetrics(true, false, 'tok')).toBe(true);
  });
});

describe('playMetricsToken', () => {
  it('sends null when signed in and the guest token otherwise', () => {
    expect(playMetricsToken(true, 'tok')).toBeNull();
    expect(playMetricsToken(false, 'tok')).toBe('tok');
    expect(playMetricsToken(false, null)).toBeNull();
  });
});

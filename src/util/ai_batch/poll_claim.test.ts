import { describe, expect, it } from 'vitest';
import { isPollClaimActive, POLL_CLAIM_STALE_MS } from './puzzle_image_ops';

describe('isPollClaimActive', () => {
  const now = Date.parse('2026-08-04T12:00:00.000Z');

  it('is inactive when poll_claimed_at is missing', () => {
    expect(isPollClaimActive(undefined, now)).toBe(false);
  });

  it('is inactive for invalid timestamps', () => {
    expect(isPollClaimActive('not-a-date', now)).toBe(false);
  });

  it('is active within the exclusive claim window', () => {
    const recent = new Date(now - POLL_CLAIM_STALE_MS + 1).toISOString();
    expect(isPollClaimActive(recent, now)).toBe(true);
  });

  it('is inactive once the claim window expires (CAS reclaim allowed)', () => {
    const stale = new Date(now - POLL_CLAIM_STALE_MS).toISOString();
    expect(isPollClaimActive(stale, now)).toBe(false);
  });
});

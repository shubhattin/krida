import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import ms from 'ms';
import { signGuestClaimTokenWith, verifyGuestClaimTokenWith } from './guest_claim_token';

const SECRET = 'test-guest-claim-secret-0123456789abcdef';
const OTHER_SECRET = 'other-guest-claim-secret-0123456789abcdef';
const NOW = Date.UTC(2026, 9, 1);

describe('guest claim tokens', () => {
  it('round-trips the kind and session id', async () => {
    const token = await signGuestClaimTokenWith(SECRET, { kind: 'dvayi', sessionId: 42 }, NOW);
    expect(await verifyGuestClaimTokenWith(SECRET, token, NOW)).toEqual({
      kind: 'dvayi',
      sessionId: 42
    });
  });

  it('rejects a token signed with another key', async () => {
    const token = await signGuestClaimTokenWith(OTHER_SECRET, { kind: 'padavali', sessionId: 7 });
    expect(await verifyGuestClaimTokenWith(SECRET, token)).toBeNull();
  });

  it('expires after the 45 day claim window', async () => {
    const token = await signGuestClaimTokenWith(SECRET, { kind: 'padajala', sessionId: 9 }, NOW);
    expect(await verifyGuestClaimTokenWith(SECRET, token, NOW + ms('44d'))).not.toBeNull();
    expect(await verifyGuestClaimTokenWith(SECRET, token, NOW + ms('46d'))).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signGuestClaimTokenWith(SECRET, { kind: 'padavali', sessionId: 5 }, NOW);
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ k: 'padavali', sid: 6 })).toString('base64url');
    expect(await verifyGuestClaimTokenWith(SECRET, `${header}.${forged}.${signature}`, NOW)).toBe(
      null
    );
  });

  it('rejects other HS256 tokens signed with the same key', async () => {
    const token = await new SignJWT({ k: 'padavali', sid: 5 })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifyGuestClaimTokenWith(SECRET, token)).toBeNull();
  });

  it('rejects a token without an expiry', async () => {
    const token = await new SignJWT({ k: 'padavali', sid: 5 })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('padavali:guest-claim')
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifyGuestClaimTokenWith(SECRET, token)).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await verifyGuestClaimTokenWith(SECRET, 'not-a-token')).toBeNull();
  });
});

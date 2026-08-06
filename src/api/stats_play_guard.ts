import { Duration, Effect } from 'effect';
import ms from 'ms';
import { RedisClient } from '~/effect/redis';

/**
 * Cross-instance play-start dedupe via Redis SET NX.
 * Same client_play_id always resolves to one session_id (within TTL).
 */
const PLAY_TTL_SECONDS = Math.floor(ms('6h') / 1000);
const PENDING_VALUE = 'pending';
const POLL = Duration.millis(50);
const MAX_POLLS = 40;

type PlayKind = 'padavali' | 'crossword';

const keyFor = (kind: PlayKind, playId: string) => `stats:play:${kind}:${playId}`;

const parseSessionId = (raw: unknown): number | null => {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === 'string' && raw !== PENDING_VALUE) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
};

export type PlayStartClaim =
  | { status: 'existing'; sessionId: number }
  | { status: 'reserved' };

/**
 * Claim a play id before inserting a session.
 * - existing: reuse session
 * - reserved: caller must create the session, then call completePlaySession
 * On Redis failure, falls back to reserved (frontend refs remain the primary loop guard).
 */
export const claimPlaySession = Effect.fn('stats.claimPlaySession')(function* (
  kind: PlayKind,
  playId: string
) {
  const redis = yield* RedisClient;
  const key = keyFor(kind, playId);

  const existing = yield* redis.get<unknown>(key).pipe(Effect.catch(() => Effect.succeed(null)));
  const existingId = parseSessionId(existing);
  if (existingId !== null) {
    return { status: 'existing', sessionId: existingId } as const satisfies PlayStartClaim;
  }

  const acquired = yield* redis
    .set(key, PENDING_VALUE, { nx: true, ex: PLAY_TTL_SECONDS })
    .pipe(
      Effect.map((result) => Boolean(result)),
      Effect.catch(() => Effect.succeed(true)) // Redis down → proceed; frontend still guards spam
    );

  if (acquired) {
    return { status: 'reserved' } as const satisfies PlayStartClaim;
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    yield* Effect.sleep(POLL);
    const raw = yield* redis.get<unknown>(key).pipe(Effect.catch(() => Effect.succeed(null)));
    const sessionId = parseSessionId(raw);
    if (sessionId !== null) {
      return { status: 'existing', sessionId } as const satisfies PlayStartClaim;
    }
  }

  // Timed out waiting; allow insert rather than hard-fail the game start.
  return { status: 'reserved' } as const satisfies PlayStartClaim;
});

export const completePlaySession = Effect.fn('stats.completePlaySession')(function* (
  kind: PlayKind,
  playId: string,
  sessionId: number
) {
  const redis = yield* RedisClient;
  yield* redis
    .set(keyFor(kind, playId), sessionId, { ex: PLAY_TTL_SECONDS })
    .pipe(Effect.catch(() => Effect.void));
});

export const releasePlaySessionClaim = Effect.fn('stats.releasePlaySessionClaim')(function* (
  kind: PlayKind,
  playId: string
) {
  const redis = yield* RedisClient;
  const key = keyFor(kind, playId);
  const raw = yield* redis.get<unknown>(key).pipe(Effect.catch(() => Effect.succeed(null)));
  if (raw === PENDING_VALUE || raw === null) {
    yield* redis.del(key).pipe(Effect.catch(() => Effect.void));
  }
});

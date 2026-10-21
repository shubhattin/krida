import { Effect } from 'effect';
import ms from 'ms';
import { and, eq, gte, isNull } from 'drizzle-orm';
import { puzzle_sessions } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';

/** Matches the play-start dedupe TTL — no real puzzle runs longer. */
const ADOPT_WINDOW_MS = ms('6h');

/**
 * A guest who signs in mid-puzzle (One Tap / popup, no reload) finishes on a
 * session that was created anonymous. Attach it to them — only while it is
 * still anonymous and recent, and only by the caller whose stats row was the
 * first one written for it. Best effort: never fails the submit.
 */
export const adoptGuestSession = (
  operation: string,
  sessionId: number,
  user: { id: string } | null | undefined
) => {
  if (!user) return Effect.void;
  return dbRunHttp(operation, async (client) => {
    await client
      .update(puzzle_sessions)
      .set({ user_id: user.id })
      .where(
        and(
          eq(puzzle_sessions.id, sessionId),
          isNull(puzzle_sessions.user_id),
          gte(puzzle_sessions.created_at, new Date(Date.now() - ADOPT_WINDOW_MS))
        )
      );
  }).pipe(Effect.catch(() => Effect.void));
};

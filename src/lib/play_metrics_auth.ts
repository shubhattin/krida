import { useSession } from '~/lib/auth-client';

/** Session settled enough to decide guest vs signed-in. Do not use isFetching. */
export function usePlayAuth() {
  const { data: session, isPending } = useSession();
  return {
    authReady: !isPending,
    isAuthed: !!session?.user
  };
}

/** Guests send a Turnstile token; signed-in players send null. */
export function playMetricsToken(isAuthed: boolean, turnstileToken: string | null) {
  return isAuthed ? null : turnstileToken;
}

/**
 * Local guests never get a token (Turnstile is off in non-PROD).
 * Local signed-in players can submit immediately once the session is ready.
 */
export function canSubmitPlayMetrics(
  authReady: boolean,
  isAuthed: boolean,
  turnstileToken: string | null
) {
  if (!authReady) return false;
  return isAuthed || !!turnstileToken;
}

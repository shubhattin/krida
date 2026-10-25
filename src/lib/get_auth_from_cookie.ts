import { authClient } from '@/lib/auth-client';
import { createIsomorphicFn, createServerOnlyFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';

/** Server-side session lookup from raw `Cookie` header (e.g. tRPC `createContext`). */
async function getSessionFromCookie(cookie: string) {
  try {
    const res = await fetch(`${import.meta.env.VITE_BETTER_AUTH_URL}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        Cookie: cookie
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch session: ${res.statusText}`);
    }
    // SAFETY: /api/auth/get-session returns the Better Auth session shape
    const session = (await res.json()) as typeof authClient.$Infer.Session;
    if (session?.user?.id) {
      const { setRequestUserId } = await import('~/lib/request-context');
      setRequestUserId(session.user.id);
    }
    return session;
  } catch {
    return null;
  }
}

type ClientSession = typeof authClient.$Infer.Session | null;
type SessionState = { data: ClientSession; isPending: boolean; isRefetching: boolean };
type SessionStore = {
  get(): SessionState;
  listen(listener: (value: SessionState) => void): () => void;
};

/**
 * Better Auth's own session store — the one `useSession()` reads. It dedupes fetches and
 * refetches on sign-in/out, update-user, focus, reconnect and cross-tab broadcasts, so
 * route guards read it instead of hitting `/get-session` on every navigation/preload.
 * UX guard only — the server re-checks the cookie on every request.
 */
// SAFETY: `atoms.session` is Better Auth's session query atom (typed `any` upstream)
const sessionStore = authClient.$store.atoms.session as SessionStore;
const isSettled = (state: SessionState) => !state.isPending && !state.isRefetching;

let keepSessionStoreMounted: (() => void) | null = null;

function getClientSession(): Promise<ClientSession> {
  // A mounted store keeps its focus/signal refetching alive even if no `useSession()` is rendered.
  keepSessionStoreMounted ??= sessionStore.listen(() => {});

  const current = sessionStore.get();
  if (isSettled(current)) return Promise.resolve(current.data);

  // Initial load or a refetch (e.g. right after sign-out) — join it instead of firing another
  return new Promise((resolve) => {
    const unlisten = sessionStore.listen((next) => {
      if (!isSettled(next)) return;
      unlisten();
      resolve(next.data);
    });
  });
}

/** Single helper for use on both server and client. */
export const getUserSession$ = createIsomorphicFn()
  .client(getClientSession)
  .server(async () => {
    const cookie = getRequestHeader('cookie');
    const session = await getSessionFromCookie(cookie ?? '');
    return session;
  });

/** Server-only (serverFn / tRPC). */
export const getServerUserSession$ = createServerOnlyFn(async () => {
  const cookie = getRequestHeader('cookie');
  const session = await getSessionFromCookie(cookie ?? '');
  return session;
});

/** @deprecated Prefer getServerUserSession$ / getUserSession$ */
export default getSessionFromCookie;

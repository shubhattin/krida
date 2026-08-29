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
    const session = (await res.json()) as typeof authClient.$Infer.Session;
    return session;
  } catch {
    return null;
  }
}

/** Single helper for use on both server and client. */
export const getUserSession$ = createIsomorphicFn()
  .client(async () => {
    const session = (await authClient.getSession()).data;
    return session;
  })
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

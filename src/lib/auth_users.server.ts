import { Effect, Schema } from 'effect';
import { getRequestHeader } from '@tanstack/react-start/server';
import { AppConfig } from '~/effect/config';
import { AuthError } from '~/effect/errors';
import { displayUserName } from '~/api/routers/user/session_user';

const AuthUserRow = Schema.Struct({
  id: Schema.String,
  name: Schema.String
});

const ByIdsResponse = Schema.Struct({
  users: Schema.Array(AuthUserRow)
});

const SearchResponse = Schema.Struct({
  users: Schema.Array(AuthUserRow)
});

export type AuthUserDisplay = {
  id: string;
  name: string;
};

const authApiUrl = (base: string, path: string) =>
  `${base.replace(/\/$/, '')}/api${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Proxy to tsc-users admin user routes (cookie-forwarded), same pattern as session lookup.
 * Only works for admin sessions — matches tsc-users `/api/user/*` guards.
 */
export const fetchAuthUsersByIds = Effect.fn('auth_users.by_ids')(function* (ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const config = yield* AppConfig;
  const cookie = getRequestHeader('cookie') ?? '';

  const response = yield* Effect.tryPromise({
    try: () =>
      fetch(authApiUrl(config.betterAuthUrl, '/user/by_ids'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie
        },
        body: JSON.stringify({ ids: uniqueIds })
      }),
    catch: (cause) => AuthError.make({ operation: 'by_ids_fetch', cause })
  });

  if (!response.ok) {
    return yield* Effect.fail(
      AuthError.make({
        operation: 'by_ids_status',
        cause: { status: response.status, statusText: response.statusText }
      })
    );
  }

  const json = yield* Effect.tryPromise({
    try: () => response.json(),
    catch: (cause) => AuthError.make({ operation: 'by_ids_json', cause })
  });

  const parsed = yield* Schema.decodeUnknown(ByIdsResponse)(json).pipe(
    Effect.mapError((cause) => AuthError.make({ operation: 'by_ids_decode', cause }))
  );

  return new Map(parsed.users.map((row) => [row.id, row.name] as const));
});

/** Resolve display names for ids; missing users fall back to Player &lt;id&gt;. */
export const resolveAuthUserNames = Effect.fn('auth_users.resolve_names')(function* (
  ids: string[]
) {
  const byId = yield* fetchAuthUsersByIds(ids);
  return new Map(
    ids.filter(Boolean).map((id) => [id, displayUserName(id, byId.get(id))] as const)
  );
});

export const searchAuthUsers = Effect.fn('auth_users.search')(function* (q: string, limit = 20) {
  const trimmed = q.trim();
  if (!trimmed) {
    return [] as AuthUserDisplay[];
  }

  const config = yield* AppConfig;
  const cookie = getRequestHeader('cookie') ?? '';
  const url = new URL(authApiUrl(config.betterAuthUrl, '/user/search'));
  url.searchParams.set('q', trimmed);
  url.searchParams.set('limit', String(limit));

  const response = yield* Effect.tryPromise({
    try: () =>
      fetch(url, {
        method: 'GET',
        headers: { Cookie: cookie }
      }),
    catch: (cause) => AuthError.make({ operation: 'search_fetch', cause })
  });

  if (!response.ok) {
    return yield* Effect.fail(
      AuthError.make({
        operation: 'search_status',
        cause: { status: response.status, statusText: response.statusText }
      })
    );
  }

  const json = yield* Effect.tryPromise({
    try: () => response.json(),
    catch: (cause) => AuthError.make({ operation: 'search_json', cause })
  });

  const parsed = yield* Schema.decodeUnknown(SearchResponse)(json).pipe(
    Effect.mapError((cause) => AuthError.make({ operation: 'search_decode', cause }))
  );

  return parsed.users.map((row) => ({
    id: row.id,
    name: displayUserName(row.id, row.name)
  }));
});

import type { authClient } from '@/lib/auth-client';
import { Effect } from 'effect';
import { AppConfig } from '~/effect/config';
import { runServerEffect } from '~/effect/run';

const get_seesion_from_cookie = async (cookie: string) => {
  try {
    const betterAuthUrl = await runServerEffect(
      Effect.gen(function* () {
        const config = yield* AppConfig;
        return config.betterAuthUrl;
      })
    );
    if (!betterAuthUrl) return null;

    const res = await fetch(`${betterAuthUrl}/api/auth/get-session`, {
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
};

export default get_seesion_from_cookie;

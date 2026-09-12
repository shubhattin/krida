import { Effect } from 'effect';
import { z } from 'zod';
import { verify_cloudflare_turnstile_token } from './trpc_init';
import { BadRequestError } from '~/effect/errors';

/** Present for guests; omitted or null when the caller is signed in. */
export const optional_turnstile_token_schema = z.string().min(1).nullable().optional();

/** Verify Turnstile only when there is no authenticated user on ctx. */
export const requireTurnstileIfGuest = Effect.fn('requireTurnstileIfGuest')(function* (
  token: string | null | undefined,
  user: { id: string } | null | undefined
) {
  if (user?.id) return;
  if (!token) {
    return yield* Effect.fail(
      BadRequestError.make({
        message: 'Invalid turnstile token'
      })
    );
  }

  const is_valid = yield* verify_cloudflare_turnstile_token(token);
  if (!is_valid) {
    return yield* Effect.fail(
      BadRequestError.make({
        message: 'Invalid turnstile token'
      })
    );
  }
});

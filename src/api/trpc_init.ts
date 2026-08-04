import type { Context } from './context';
import { TRPCError, initTRPC } from '@trpc/server';
import { Effect, Redacted, Schema } from 'effect';
import { AppConfig } from '~/effect/config';
import transformer from './transformer';

export const t = initTRPC.context<Context>().create({
  transformer
});

export const publicProcedure = t.procedure;

export const protectedUnverifiedProcedure = publicProcedure.use(async function isAuthed({
  next,
  ctx: { user }
}) {
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({
    ctx: { user }
  });
});

export const protectedProcedure = publicProcedure.use(async function isAuthed({
  next,
  ctx: { user }
}) {
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({
    ctx: { user }
  });
});

export const protectedAdminProcedure = protectedProcedure.use(async function isAuthed({
  next,
  ctx: { user }
}) {
  if (user.role !== 'admin')
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not a Admin User' });
  return next({
    ctx: { user }
  });
});

const TurnstileSiteverifyResponse = Schema.Struct({
  success: Schema.Boolean
});

/** Verify Cloudflare Turnstile token using AppConfig secret. */
export const verify_cloudflare_turnstile_token = Effect.fn('verify_cloudflare_turnstile_token')(
  function* (token: string) {
    const config = yield* AppConfig;
    if (!config.turnstileSecretKey) {
      return false;
    }

    const secret = Redacted.value(config.turnstileSecretKey);

    const raw = yield* Effect.tryPromise({
      try: async () => {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: JSON.stringify({ secret, response: token }),
          headers: { 'Content-Type': 'application/json' }
        });
        return response.json();
      },
      catch: (cause) => cause
    }).pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          console.error(error);
          return null;
        })
      )
    );

    if (raw === null) return false;

    const decoded = yield* Schema.decodeUnknownEffect(TurnstileSiteverifyResponse)(raw).pipe(
      Effect.catch(() => Effect.succeed({ success: false }))
    );
    return decoded.success;
  }
);

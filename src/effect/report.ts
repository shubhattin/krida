import { Cause, Effect, Exit } from 'effect';
import { captureEffectFailure } from '~/lib/posthog-server';

/** Report a swallowed failure, then let the caller log and continue. */
export const reportSwallowedError = (source: string) => (cause: unknown) =>
  Effect.promise(() => captureEffectFailure(Cause.fail(cause), { source })).pipe(Effect.asVoid);

/**
 * Run an effect, report its failure, and continue.
 * Used where side effects are intentionally ignored after a successful primary write.
 */
export const ignoreReportedFailure = <A, E, R>(effect: Effect.Effect<A, E, R>, source: string) =>
  Effect.exit(effect).pipe(
    Effect.flatMap((exit) =>
      Exit.isSuccess(exit)
        ? Effect.void
        : Effect.promise(() => captureEffectFailure(exit.cause, { source })).pipe(Effect.asVoid)
    )
  );

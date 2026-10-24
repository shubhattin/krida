import { Cause, Effect, Exit } from 'effect';
import { z } from 'zod';
import { appRuntime } from '~/effect/runtime';

const error_like_schema = z.object({
  _tag: z.string().optional(),
  message: z.string().optional(),
  cause: z.unknown().optional()
});

function messageOf(error: z.input<typeof error_like_schema> | string): string {
  const parsed = error_like_schema.safeParse(error);
  if (!parsed.success) return String(error);
  const { _tag, message, cause } = parsed.data;
  // DatabaseError / AiProviderError wrap the driver error in `cause`: that is the useful text.
  if (cause !== undefined && _tag !== 'BadRequestError') {
    const inner = error_like_schema.safeParse(cause);
    if (inner.success) return messageOf(inner.data);
  }
  return message || String(error);
}

/**
 * Run a tool's Effect. A failure is thrown as a plain Error with the real reason (e.g. the
 * Postgres message), which the AI SDK hands back to the model as the tool error.
 */
export async function runToolEffect<A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> {
  // SAFETY: tool effects only need app services (R ⊆ AppLayer), as at the other run boundaries
  const exit = await appRuntime.runPromiseExit(
    effect.pipe(Effect.annotateLogs({ boundary: 'agent_tool' })) as Effect.Effect<A, E>
  );
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.findErrorOption(exit.cause);
  if (failure._tag === 'None') throw new Error(Cause.pretty(exit.cause));
  const parsed = error_like_schema.safeParse(failure.value);
  throw new Error(parsed.success ? messageOf(parsed.data) : String(failure.value));
}

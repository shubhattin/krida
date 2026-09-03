import { Context, Effect, Layer } from 'effect';

/**
 * Platform-agnostic background work API.
 * Pass a lazy thunk so work is not started until enqueue runs.
 *
 * Live: `src/effect/live/background.ts` (`waitUntil` from `cloudflare:workers`).
 */
export class BackgroundWork extends Context.Service<
  BackgroundWork,
  {
    readonly enqueue: (work: () => Promise<void>) => Effect.Effect<void>;
  }
>()('BackgroundWork') {
  /** Runs the work inline for tests. */
  static readonly Test = Layer.succeed(BackgroundWork)({
    enqueue: (work) =>
      Effect.promise(() =>
        Promise.resolve()
          .then(work)
          .catch((error) => {
            console.error('[background] work failed', error);
          })
      )
  });
}

export const enqueueBackground = (work: () => Promise<void>) =>
  Effect.gen(function* () {
    const background = yield* BackgroundWork;
    yield* background.enqueue(work);
  });

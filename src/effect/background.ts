import { Context, Effect, Layer } from 'effect';
import { waitUntil } from '@vercel/functions';

/**
 * Background work that preserves Vercel `waitUntil` semantics.
 * Pass a lazy thunk so work is not started until enqueue runs.
 */
export class BackgroundWork extends Context.Service<
  BackgroundWork,
  {
    readonly enqueue: (work: () => Promise<void>) => Effect.Effect<void>;
  }
>()('BackgroundWork') {
  static readonly Live = Layer.succeed(BackgroundWork)({
    enqueue: (work) =>
      Effect.sync(() => {
        waitUntil(
          Promise.resolve()
            .then(work)
            .catch((error) => {
              console.error('[background] work failed', error);
            })
        );
      })
  });

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

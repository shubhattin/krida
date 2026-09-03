import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { BackgroundWork } from './background';
import { makeAppRuntime } from './runtime';

describe('makeAppRuntime', () => {
  it('builds a request runtime that can enqueue background work', async () => {
    const runtime = makeAppRuntime();
    await runtime.runPromise(
      Effect.gen(function* () {
        const background = yield* BackgroundWork;
        yield* background.enqueue(async () => undefined);
      })
    );
    expect(runtime.runPromise).toBeTypeOf('function');
    await runtime.dispose();
  });

  it('keeps BackgroundWork.Test independent of the Cloudflare live', async () => {
    const ran = { value: false };
    await Effect.runPromise(
      Effect.gen(function* () {
        const background = yield* BackgroundWork;
        yield* background.enqueue(async () => {
          ran.value = true;
        });
      }).pipe(Effect.provide(BackgroundWork.Test))
    );
    expect(ran.value).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { enqueueBackground } from '../background';
import { BackgroundWorkLive } from './background';

describe('BackgroundWorkLive (Cloudflare waitUntil)', () => {
  it('enqueues work through waitUntil without blocking', async () => {
    let ran = false;
    await Effect.runPromise(
      enqueueBackground(async () => {
        ran = true;
      }).pipe(Effect.provide(BackgroundWorkLive))
    );
    await Promise.resolve();
    expect(ran).toBe(true);
  });
});

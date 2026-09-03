import { Effect, Layer } from 'effect';
import { waitUntil } from 'cloudflare:workers';
import { BackgroundWork } from '../background';

/**
 * Cloudflare Live: import `waitUntil` from `cloudflare:workers` so background
 * work (cache warm, etc.) continues after the response without passing `ctx`.
 * @see https://developers.cloudflare.com/changelog/post/2025-08-08-add-waituntil-cloudflare-workers/
 */
export const BackgroundWorkLive = Layer.succeed(BackgroundWork)({
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

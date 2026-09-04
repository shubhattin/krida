/**
 * Illustrative — copy into shared effect/ when an app runs on workerd.
 *
 * @see https://developers.cloudflare.com/workers/runtime-apis/web-standards/#navigatoruseragent
 */

/** True in production Workers and in `bun run dev` (Miniflare). False in Node / Vitest. */
export const isCloudflareWorker = (): boolean =>
  globalThis.navigator?.userAgent === 'Cloudflare-Workers';

/**
 * Effect.cached / in-flight Maps store fibers pinned to the creating request.
 * Joining them from a later request hangs workerd. Plain cached *data* is fine.
 */
export const canShareInFlightFibers = (): boolean => !isCloudflareWorker();

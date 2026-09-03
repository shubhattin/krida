/**
 * workerd (Miniflare / `vite dev` / production Workers) pins every Promise to
 * the request that created it. Effect's scheduler and `Effect.cached` are
 * isolate-global, so joining a fiber from a later request hangs when the
 * original IoContext is already gone.
 *
 * @see https://developers.cloudflare.com/workers/runtime-apis/web-standards/#navigatoruseragent
 */
export const isCloudflareWorker = (): boolean =>
  globalThis.navigator?.userAgent === 'Cloudflare-Workers';

export const canShareInFlightFibers = (): boolean => !isCloudflareWorker();

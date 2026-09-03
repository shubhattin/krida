import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { runWithRequestRuntime } from './effect/runtime';

/**
 * One Effect ManagedRuntime per Worker request. Sharing a process-wide runtime
 * lets fibers settle after the creating request finished, which Cloudflare
 * cancels — and can hang the next request.
 */
export default createServerEntry({
  fetch(request) {
    return runWithRequestRuntime(() => Promise.resolve(handler.fetch(request)));
  }
});

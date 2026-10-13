import {
  createStartHandler,
  defaultStreamHandler,
  handleStartError
} from '@tanstack/react-start/server';
import { createServerEntry } from '@tanstack/react-start/server-entry';
import type { Register } from '@tanstack/react-router';
import type { RequestHandler } from '@tanstack/react-start/server';
import { captureThrownError } from '~/lib/posthog-server';
import { runWithRequest } from '~/lib/request-context';

const startHandler = createStartHandler(defaultStreamHandler);

// Providing `RequestHandler` from `@tanstack/react-start/server` is required so that the output types don't import it from `@tanstack/start-server-core`
export type ServerEntry = { fetch: RequestHandler<Register> };

export default createServerEntry({
  async fetch(request, opts) {
    return runWithRequest(request, async () => {
      try {
        return await startHandler(request, opts);
      } catch (error) {
        await captureThrownError(error, 'server');
        return handleStartError(error);
      }
    });
  }
});

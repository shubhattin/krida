import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import type { Register } from '@tanstack/react-router';
import type { RequestHandler } from '@tanstack/react-start/server';
import { captureThrownError } from '~/lib/posthog-server';
import { runWithRequest } from '~/lib/request-context';

const startFetch = createStartHandler(defaultStreamHandler);

// Providing `RequestHandler` from `@tanstack/react-start/server` is required so that the output types don't import it from `@tanstack/start-server-core`
export type ServerEntry = { fetch: RequestHandler<Register> };

function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
    async fetch(...args) {
      const request = args[0];
      return runWithRequest(request, async () => {
        try {
          return await entry.fetch(...args);
        } catch (error) {
          await captureThrownError(error, 'server');
          throw error;
        }
      });
    }
  };
}

export default createServerEntry({ fetch: startFetch });

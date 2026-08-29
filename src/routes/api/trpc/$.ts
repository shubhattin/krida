import { createFileRoute } from '@tanstack/react-router';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { appRouter } from '~/api/trpc_router';
import { createContext } from '~/api/context';

function trpcHandler(request: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => createContext()
  });
}

export const Route = createFileRoute('/api/trpc/$')({
  server: {
    handlers: {
      GET: ({ request }) => trpcHandler(request),
      POST: ({ request }) => trpcHandler(request),
      PATCH: ({ request }) => trpcHandler(request)
    }
  }
});

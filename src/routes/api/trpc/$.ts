import { createFileRoute } from '@tanstack/react-router';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { appRouter } from '~/api/trpc_router';
import { createContext } from '~/api/context';
import { isSameOriginRequest } from '~/lib/same_origin';

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
      // Mutations: reject cross-site browser requests (auth cookie is SameSite=None).
      POST: ({ request }) =>
        isSameOriginRequest(request, import.meta.env.VITE_SITE_URL)
          ? trpcHandler(request)
          : new Response('Cross-site request rejected', { status: 403 })
    }
  }
});

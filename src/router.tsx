import { createRouter as createTanStackRouter, ErrorComponent } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { routeTree } from './routeTree.gen';
import { createQueryClient } from './state/queryClient';

/** query-core ≥ 5.102.1 throws if hydrate() is called with undefined. */
const EMPTY_DEHYDRATED_QUERY_STATE = { mutations: [], queries: [] };

type QueryStreamCancelReason = string | Error | undefined;

type QueryStreamReader = {
  closed: Promise<undefined>;
  cancel: (reason?: QueryStreamCancelReason) => Promise<void>;
  releaseLock: () => void;
  read: () => Promise<ReadableStreamReadResult<unknown>>;
};

type QueryStreamLike = {
  getReader: () => QueryStreamReader;
};

/**
 * router-ssr-query-core hydrates every stream read, including the terminal
 * `{ done: true, value: undefined }` chunk. Return an empty dehydrate payload
 * on that last read so query-core does not throw.
 */
const withSafeQueryStreamEnd = <T extends { queryStream?: QueryStreamLike }>(dehydrated: T): T => {
  const stream = dehydrated.queryStream;
  if (!stream) return dehydrated;

  return {
    ...dehydrated,
    queryStream: {
      getReader() {
        const reader = stream.getReader();
        return {
          closed: reader.closed,
          cancel: (reason?: QueryStreamCancelReason) => reader.cancel(reason),
          releaseLock: () => reader.releaseLock(),
          async read() {
            const result = await reader.read();
            if (result.done) {
              return { done: true, value: EMPTY_DEHYDRATED_QUERY_STATE };
            }
            return result;
          }
        };
      }
    }
  };
};

export function getRouter() {
  const queryClient = createQueryClient();
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ErrorComponent
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  const hydrateQueries = router.options.hydrate;
  if (hydrateQueries) {
    router.options.hydrate = (dehydrated) =>
      // SAFETY: hydrate receives the framework dehydrated payload; we only wrap it if queryStream is present
      hydrateQueries(withSafeQueryStreamEnd(dehydrated as { queryStream?: QueryStreamLike }));
  }

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

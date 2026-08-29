import type { QueryClient } from '@tanstack/react-query';
import { createServerOnlyFn } from '@tanstack/react-start';

/**
 * Builds tRPC query options backed by an in-process caller for one SSR request.
 * Same procedure paths/keys as `useTRPC`, without loopback HTTP during SSR.
 */
export const createServerTRPC = createServerOnlyFn(async (queryClient: QueryClient) => {
  const [{ createTRPCOptionsProxy }, { createContext }, { appRouter }] = await Promise.all([
    import('@trpc/tanstack-react-query'),
    import('./context'),
    import('./trpc_router')
  ]);

  return createTRPCOptionsProxy({
    router: appRouter,
    ctx: createContext,
    queryClient
  });
});

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { appRouter } from '@/api/trpc_router';
import { createContext } from '~/api/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req })
  });

export { handler as GET, handler as POST };

// export const runtime = 'edge';

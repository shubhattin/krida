import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { type AppRouter } from './trpc_router';
import transformer from './transformer';

export const client_q = createTRPCReact<AppRouter>({});
export const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer
    })
  ]
});

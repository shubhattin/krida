'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import React, { useState } from 'react';
import transformer from './transformer';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { trpc_q } from './client';

export default function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({}));
  const [trpcClient] = useState(() =>
    trpc_q.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer
        })
      ]
    })
  );
  return (
    <trpc_q.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        {children}
      </QueryClientProvider>
    </trpc_q.Provider>
  );
}

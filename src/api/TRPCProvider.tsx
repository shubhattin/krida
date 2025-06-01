'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import transformer from './transformer';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { client_q } from './client';
import { queryClient as queryClientGlobal } from '~/state/queryClient';

export default function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(queryClientGlobal);
  const [trpcClient] = useState(() =>
    client_q.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer
        })
      ]
    })
  );

  return (
    <client_q.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        {children}
      </QueryClientProvider>
    </client_q.Provider>
  );
}

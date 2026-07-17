'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import transformer from './transformer';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import NotificationsOneSignal from '~/components/NotificationsOneSignal';

import { client_q } from './client';
import { queryClient as queryClientGlobal } from '~/state/queryClient';

export default function Provider({
  children,
  enableNotifications = true
}: {
  children: React.ReactNode;
  /** OneSignal is Padavali-only; Crossword passes false. */
  enableNotifications?: boolean;
}) {
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
        {enableNotifications ? <NotificationsOneSignal /> : null}
      </QueryClientProvider>
    </client_q.Provider>
  );
}

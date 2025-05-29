'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import transformer from './transformer';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Provider as JotaiProvider, createStore } from 'jotai';

import { client_q } from './client';
import { queryClient as queryClientGlobal } from '~/state/queryClient';
import { script_atom } from '~/state/main.state';
import { type ScriptType } from '~/state/script_font_data';

export default function Provider({
  children,
  script
}: {
  children: React.ReactNode;
  script: ScriptType;
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

  const jotaiStore = (() => {
    const store = createStore();
    store.set(script_atom, script);
    return store;
  })();

  return (
    <JotaiProvider store={jotaiStore}>
      <client_q.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          {children}
        </QueryClientProvider>
      </client_q.Provider>
    </JotaiProvider>
  );
}

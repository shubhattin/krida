'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import React, { useEffect, useState, useMemo } from 'react';
import transformer from './transformer';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Provider as JotaiProvider, createStore, useAtom } from 'jotai';

import { trpc_q } from './client';
import { queryClient as queryClientGlobal } from '~/state/queryClient';
import { user_info_atom } from '~/state/user.state';
import { useSession, authClient } from '~/lib/auth-client';

export default function Provider({
  children,
  user_info_init
}: {
  children: React.ReactNode;
  user_info_init?: (typeof authClient.$Infer.Session)['user'] | null;
}) {
  const [, setUserInfo] = useAtom(user_info_atom);
  const session = useSession();

  // create a Jotai store seeded with server-provided user info
  const jotaiStore = (() => {
    const store = createStore();
    store.set(user_info_atom, user_info_init);
    return store;
  })();
  // useMemo not needed as using reactCompiler

  useEffect(() => {
    if (!session.isPending) {
      setUserInfo(session.data?.user);
    }
  }, [session]);

  const [queryClient] = useState(queryClientGlobal);
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
    <JotaiProvider store={jotaiStore}>
      <trpc_q.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          {children}
        </QueryClientProvider>
      </trpc_q.Provider>
    </JotaiProvider>
  );
}

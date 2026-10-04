import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { useState } from 'react';

import appCss from '../styles.css?url';
import '../app.scss';
import '~/components/fonts';
import { TRPCProvider } from '~/api/client';
import transformer from '~/api/transformer';
import type { AppRouter } from '~/api/trpc_router';
import {
  createThemeInitScript,
  DEFAULT_THEME_STORAGE_KEY,
  ThemeProvider,
  type Theme
} from '~/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '~/lib/utils';
import { RouteProgress } from '~/components/RouteProgress';
import PosthogInit from '~/components/tags/PosthogInit';
import PWAInit from '~/components/PWA/PWAInit';
import NotFound from './-NotFound';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: true,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      },
      { title: 'Krida' },
      { name: 'apple-mobile-web-app-title', content: 'Krida' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/favicon.ico' },
      { rel: 'manifest', href: '/manifest.json' }
    ]
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound
});

const DEFAULT_THEME: Theme = 'system';
const THEME_STORAGE_KEY = DEFAULT_THEME_STORAGE_KEY;

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn('font-sans')}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: createThemeInitScript(THEME_STORAGE_KEY, DEFAULT_THEME)
          }}
        />
        <HeadContent />
      </head>
      <body className={cn('overflow-y-scroll font-sans antialiased')}>
        <RouteProgress />
        <RootProviders>{children}</RootProviders>
        <PosthogInit />
        <Scripts />
      </body>
    </html>
  );
}

function RootProviders({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer
        })
      ]
    })
  );

  return (
    <ThemeProvider defaultTheme={DEFAULT_THEME} storageKey={THEME_STORAGE_KEY}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <Toaster richColors={true} />
        {children}
        <PWAInit />
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
              { name: 'Tanstack Query', render: <ReactQueryDevtoolsPanel /> }
            ]}
          />
        )}
      </TRPCProvider>
    </ThemeProvider>
  );
}

import { type ReactNode } from 'react';
import TRPCProvider from '~/api/TRPCProvider';
import AppBar from '~/components/app-bar/AppBar';
import { AppContextProvider } from '~/components/AppDataContext';
import { getCachedScript } from '~/lib/cache_server_route_data';
import PWAInit from '~/components/PWA/PWAInit';

export default async function CrosswordLayout({ children }: { children: ReactNode }) {
  const script = await getCachedScript();

  return (
    <TRPCProvider>
      <AppContextProvider initialScript={script}>
        <AppBar title="Crossword" />
        <div className="mx-2">{children}</div>
        <PWAInit />
      </AppContextProvider>
    </TRPCProvider>
  );
}

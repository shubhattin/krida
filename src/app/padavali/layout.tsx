import { type ReactNode } from 'react';
import TRPCProvider from '~/api/TRPCProvider';
import AppBar from '~/components/app-bar/AppBar';
import { AppContextProvider } from '~/components/AppDataContext';
import { getCachedScript, getCachedSession } from '~/lib/cache_server_route_data';
import PWAInit from '~/components/PWA/PWAInit';

export default async function PadavaliLayout({ children }: { children: ReactNode }) {
  const script = await getCachedScript();
  const session = await getCachedSession();

  return (
    <TRPCProvider>
      <AppContextProvider initialScript={script} initialSession={session}>
        <AppBar title="Padavali" />
        <div className="mx-2">{children}</div>
        <PWAInit />
      </AppContextProvider>
    </TRPCProvider>
  );
}

import { type ReactNode } from 'react';
import TRPCProvider from '~/api/TRPCProvider';
import AppBar from '~/components/app-bar/AppBar';
import { PadavaliMenuItems } from '~/components/app-bar/GameMenuItems';
import { AppContextProvider } from '~/components/AppDataContext';
import { getCachedScript } from '~/lib/cache_server_route_data';
import PWAInit from '~/components/PWA/PWAInit';

export default async function PadavaliLayout({ children }: { children: ReactNode }) {
  const script = await getCachedScript();

  return (
    <TRPCProvider>
      <AppContextProvider initialScript={script}>
        <AppBar game="padavali" gameMenuItems={<PadavaliMenuItems />} />
        <div className="mx-2">{children}</div>
        <PWAInit />
      </AppContextProvider>
    </TRPCProvider>
  );
}

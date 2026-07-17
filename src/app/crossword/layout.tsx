import { type ReactNode } from 'react';
import TRPCProvider from '~/api/TRPCProvider';
import AppBar from '~/components/app-bar/AppBar';
import { CrosswordMenuItems } from '~/components/app-bar/GameMenuItems';
import { AppContextProvider } from '~/components/AppDataContext';
import { getCachedScript } from '~/lib/cache_server_route_data';

export default async function CrosswordLayout({ children }: { children: ReactNode }) {
  const script = await getCachedScript();

  return (
    <TRPCProvider enableNotifications={false}>
      <AppContextProvider initialScript={script}>
        <AppBar game="crossword" gameMenuItems={<CrosswordMenuItems />} />
        <div className="mx-2">{children}</div>
      </AppContextProvider>
    </TRPCProvider>
  );
}

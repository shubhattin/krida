import { type ReactNode } from 'react';
import type { Metadata } from 'next';
import TRPCProvider from '~/api/TRPCProvider';
import AppBar from '~/components/app-bar/AppBar';
import { CrosswordMenuItems } from '~/components/app-bar/GameMenuItems';
import { AppContextProvider } from '~/components/AppDataContext';
import { getCachedScript } from '~/lib/cache_server_route_data';

export const metadata: Metadata = {
  icons: {
    icon: [{ url: '/padajala.favicon.ico', type: 'image/x-icon' }],
    shortcut: '/padajala.favicon.ico',
    apple: '/img/padajala_icons/icon_128.png'
  }
};

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

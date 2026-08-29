import { Outlet, createFileRoute } from '@tanstack/react-router';
import AppBar from '~/components/app-bar/AppBar';
import { PadavaliMenuItems } from '~/components/app-bar/GameMenuItems';
import { AppContextProvider } from '~/components/AppDataContext';
import { getScript$ } from '~/lib/cache_server_route_data';
import PWAInit from '~/components/PWA/PWAInit';
import NotificationsOneSignal from '~/components/NotificationsOneSignal';

export const Route = createFileRoute('/padavali')({
  loader: async () => ({ script: await getScript$() }),
  component: PadavaliLayout
});

function PadavaliLayout() {
  const { script } = Route.useLoaderData();

  return (
    <AppContextProvider initialScript={script}>
      <AppBar game="padavali" gameMenuItems={<PadavaliMenuItems />} />
      <div className="mx-2">
        <Outlet />
      </div>
      <PWAInit />
      <NotificationsOneSignal />
    </AppContextProvider>
  );
}

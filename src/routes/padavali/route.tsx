import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppContextProvider } from '~/components/AppDataContext';
import { getScript$ } from '~/lib/cache_server_route_data';
import NotificationsOneSignal from '~/components/NotificationsOneSignal';

export const Route = createFileRoute('/padavali')({
  loader: async () => ({ script: await getScript$() }),
  component: PadavaliLayout
});

function PadavaliLayout() {
  const { script } = Route.useLoaderData();

  return (
    <AppContextProvider initialScript={script}>
      <Outlet />
      <NotificationsOneSignal />
    </AppContextProvider>
  );
}

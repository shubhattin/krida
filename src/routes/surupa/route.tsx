import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppContextProvider } from '~/components/AppDataContext';
import { getScript$ } from '~/lib/cache_server_route_data';

export const Route = createFileRoute('/surupa')({
  loader: async () => ({ script: await getScript$() }),
  component: SimpleGameRootLayout
});

function SimpleGameRootLayout() {
  const { script } = Route.useLoaderData();
  return (
    <AppContextProvider initialScript={script}>
      <Outlet />
    </AppContextProvider>
  );
}

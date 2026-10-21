import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppContextProvider } from '~/components/AppDataContext';
import { getScript$ } from '~/lib/cache_server_route_data';

export const Route = createFileRoute('/surupa')({
  loader: async () => ({ script: await getScript$() }),
  head: () => ({
    links: [
      { rel: 'icon', href: '/surupa.favicon.ico', type: 'image/x-icon' },
      { rel: 'shortcut icon', href: '/surupa.favicon.ico' },
      { rel: 'apple-touch-icon', href: '/img/surupa_icons/icon_128.png' }
    ]
  }),
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

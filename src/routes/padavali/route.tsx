import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppContextProvider } from '~/components/AppDataContext';
import { getScript$ } from '~/lib/cache_server_route_data';

export const Route = createFileRoute('/padavali')({
  loader: async () => ({ script: await getScript$() }),
  head: () => ({
    links: [
      { rel: 'icon', href: '/padavali.favicon.ico?v=2', type: 'image/x-icon' },
      { rel: 'shortcut icon', href: '/padavali.favicon.ico?v=2' },
      { rel: 'apple-touch-icon', href: '/img/padavali_icons/icon_128.png?v=2' }
    ]
  }),
  component: PadavaliLayout
});

function PadavaliLayout() {
  const { script } = Route.useLoaderData();

  return (
    <AppContextProvider initialScript={script}>
      <Outlet />
    </AppContextProvider>
  );
}

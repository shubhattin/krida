import { Outlet, createFileRoute } from '@tanstack/react-router';
import AppBar from '~/components/app-bar/AppBar';
import { CrosswordMenuItems } from '~/components/app-bar/GameMenuItems';
import { AppContextProvider } from '~/components/AppDataContext';
import { getScript$ } from '~/lib/cache_server_route_data';

export const Route = createFileRoute('/padajala')({
  loader: async () => ({ script: await getScript$() }),
  head: () => ({
    links: [
      { rel: 'icon', href: '/padajala.favicon.ico', type: 'image/x-icon' },
      { rel: 'shortcut icon', href: '/padajala.favicon.ico' },
      { rel: 'apple-touch-icon', href: '/img/padajala_icons/icon_128.png' }
    ]
  }),
  component: PadajalaLayout
});

function PadajalaLayout() {
  const { script } = Route.useLoaderData();

  return (
    <AppContextProvider initialScript={script}>
      <AppBar game="crossword" gameMenuItems={<CrosswordMenuItems />} />
      <div className="mx-2">
        <Outlet />
      </div>
    </AppContextProvider>
  );
}

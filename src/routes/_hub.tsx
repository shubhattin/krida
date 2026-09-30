import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppContextProvider } from '~/components/AppDataContext';
import { hubData$ } from '~/components/hub/hub_data';
import HubShell from '~/components/hub/HubShell';

/** Pathless layout for the unified, cross-game public pages (`/`, `/explore`, `/collections/*`). */
export const Route = createFileRoute('/_hub')({
  loader: () => hubData$(),
  component: HubLayout
});

function HubLayout() {
  const data = Route.useLoaderData();

  return (
    <AppContextProvider initialScript={data.script}>
      <HubShell data={data}>
        <Outlet />
      </HubShell>
    </AppContextProvider>
  );
}

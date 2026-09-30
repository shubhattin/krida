import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppContextProvider } from '~/components/AppDataContext';
import { CrosswordMenuItems, PadavaliMenuItems } from '~/components/app-bar/GameMenuItems';
import { hubData$, hubNavFromData } from '~/components/hub/hub_data';
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
      <HubShell
        nav={hubNavFromData(data)}
        showPwaControls
        gameMenuItems={
          <>
            <PadavaliMenuItems />
            <CrosswordMenuItems />
          </>
        }
      >
        <Outlet />
      </HubShell>
    </AppContextProvider>
  );
}

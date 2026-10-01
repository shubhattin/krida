import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppContextProvider } from '~/components/AppDataContext';
import { CrosswordMenuItems, PadavaliMenuItems } from '~/components/app-bar/GameMenuItems';
import { hubData$ } from '~/components/hub/hub_data';
import HubShell from '~/components/hub/HubShell';
import { tagsFromPuzzles } from '~/components/hub/hub_puzzles';

/** Pathless layout for the unified, cross-game public pages (`/`, `/explore`, `/collections/*`). */
export const Route = createFileRoute('/_hub')({
  loader: () => hubData$(),
  component: HubLayout
});

function HubLayout() {
  const data = Route.useLoaderData();
  const tags = tagsFromPuzzles([...data.padavali.listed, ...data.crossword.listed]).slice(0, 20);

  return (
    <AppContextProvider initialScript={data.script}>
      <HubShell
        collections={data.collections}
        tags={tags}
        today={{ padavali: data.padavali.today, crossword: data.crossword.today }}
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

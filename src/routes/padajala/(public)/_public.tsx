import { createFileRoute, Outlet } from '@tanstack/react-router';
import { CrosswordMenuItems } from '~/components/app-bar/GameMenuItems';
import HubFooter from '~/components/hub/HubFooter';
import HubHeader from '~/components/hub/HubHeader';
import { HUB_GAMES } from '~/components/hub/hub_games';

export const Route = createFileRoute('/padajala/(public)/_public')({
  component: PublicLayout
});

function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <HubHeader currentGame={HUB_GAMES.crossword} gameMenuItems={<CrosswordMenuItems />} />
      <div className="mx-2 flex-1">
        <Outlet />
      </div>
      <HubFooter />
    </div>
  );
}

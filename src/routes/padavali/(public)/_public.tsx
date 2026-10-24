import { Outlet, createFileRoute } from '@tanstack/react-router';
import { PadavaliMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubFooter } from '~/components/hub/HubFooter';
import { HubHeader } from '~/components/hub/HubHeader';
import { HUB_GAMES } from '~/components/hub/hub_games';
import { publicLayoutGames } from '~/util/games/visibility';

export const Route = createFileRoute('/padavali/(public)/_public')({
  component: PublicLayout
});

function PublicLayout() {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader
        showPwaControls
        gameMenuItems={<PadavaliMenuItems />}
        games={publicLayoutGames('padavali').map((game) => HUB_GAMES[game])}
      />
      <div className="flex-1">
        <Outlet />
      </div>
      <HubFooter />
    </div>
  );
}

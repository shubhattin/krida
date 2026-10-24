'use client';

import { useMemo, type ReactNode } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { AllGamesMenuItems, CollectionAdminMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubHeader } from './HubHeader';
import { HUB_GAMES } from './hub_games';
import { HubFooter } from './HubFooter';

const hubRoute = getRouteApi('/_hub');

/** Shared chrome for the unified hub pages. */
export default function HubShell({ children }: { children: ReactNode }) {
  // Release gate: the switcher only names games with a listed puzzle
  // (padavali/padajala always). Admin/auth layouts omit `games` → all games.
  const { visibleGames } = hubRoute.useLoaderData();
  const games = useMemo(() => visibleGames.map((kind) => HUB_GAMES[kind]), [visibleGames]);
  return (
    <div className="public-canvas flex min-h-dvh flex-col text-foreground">
      {/* Collection edit (when open) first, then admin hub + shortcuts — admins only. */}
      <HubHeader
        showPwaControls
        games={games}
        gameMenuItems={
          <>
            <CollectionAdminMenuItems />
            <AllGamesMenuItems />
          </>
        }
      />
      <main className="flex-1">{children}</main>
      <HubFooter />
    </div>
  );
}

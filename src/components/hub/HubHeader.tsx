'use client';

import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Image } from '@unpic/react';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { profileContextFromPath, UserProfileChip } from '~/components/app-bar/UserProfileChip';
import SupportOptions from '~/components/app-bar/SupportOptions';
import { HUB_GAME_LIST, hubNavFromPath, type HubGameMeta } from './hub_games';
import { HubNavSwitcher } from './HubNavSwitcher';

export function HubHeader({
  gameMenuItems,
  showPwaControls = false,
  games
}: {
  gameMenuItems?: ReactNode;
  showPwaControls?: boolean;
  /**
   * Games shown in the switcher. Hub pages pass the release-gated list;
   * per-game public layouts pass their own gated list; admin/auth omit it
   * and get every game.
   */
  games?: HubGameMeta[];
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const active = hubNavFromPath(pathname);
  const resolvedGames = games ?? HUB_GAME_LIST;

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/"
            aria-label="Krida home"
            className="flex size-9 shrink-0 items-center justify-center no-underline"
          >
            <Image
              src="/img/icon_128.png?v=2"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-xl shadow-md"
            />
          </Link>
          <Link to="/" className="hidden min-w-0 no-underline sm:block">
            <span className="block text-sm font-black tracking-tight text-slate-900 dark:text-slate-50">
              Krida
            </span>
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Play, learn, grow
            </span>
          </Link>
          <HubNavSwitcher active={active} games={resolvedGames} />
        </div>

        <div className="min-w-0 flex-1" />

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <SupportOptions />
          <UserProfileChip context={profileContextFromPath(pathname)} />
          <div className="size-8 shrink-0">
            <MenuButton showPwaControls={showPwaControls} gameMenuItems={gameMenuItems} />
          </div>
        </div>
      </div>
    </header>
  );
}

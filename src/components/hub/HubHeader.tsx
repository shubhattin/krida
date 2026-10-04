'use client';

import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutGrid } from 'lucide-react';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { UserProfileChip } from '~/components/app-bar/UserProfileChip';
import SupportOptions from '~/components/app-bar/SupportOptions';
import { HubNavSwitcher } from './HubNavSwitcher';
import { HUB_GAMES, hubNavFromPath } from './hub_games';

export function HubHeader({
  gameMenuItems,
  showPwaControls = false
}: {
  gameMenuItems?: ReactNode;
  showPwaControls?: boolean;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const active = hubNavFromPath(pathname);
  const activeGame = active === 'padavali' || active === 'crossword' ? HUB_GAMES[active] : null;
  const profileGame = activeGame?.kind ?? 'padavali';
  const profileLabel = activeGame?.name ?? 'Krida';

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/"
            aria-label="Krida home"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 no-underline shadow-md shadow-blue-500/20"
          >
            <LayoutGrid className="size-4 text-white" />
          </Link>
          <Link to="/" className="hidden min-w-0 no-underline sm:block">
            <span className="block text-sm font-black tracking-tight text-slate-900 dark:text-slate-50">
              Krida <span className="font-noto-sans-devanagari">(क्रीडा)</span>
            </span>
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Play, learn, grow
            </span>
          </Link>
          <HubNavSwitcher active={active} />
        </div>

        <div className="min-w-0 flex-1" />

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <SupportOptions />
          <UserProfileChip game={profileGame} gameLabel={profileLabel} />
          <div className="size-8 shrink-0">
            <MenuButton showPwaControls={showPwaControls} gameMenuItems={gameMenuItems} />
          </div>
        </div>
      </div>
    </header>
  );
}

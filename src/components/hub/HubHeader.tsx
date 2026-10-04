'use client';

import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Compass, Home, LayoutGrid } from 'lucide-react';
import { Image } from '@unpic/react';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { UserProfileChip } from '~/components/app-bar/UserProfileChip';
import SupportOptions from '~/components/app-bar/SupportOptions';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { cn } from '~/lib/utils';
import { HUB_GAME_ACCENT, HUB_GAMES, hubNavFromPath } from './hub_games';

type NavKey = 'home' | 'padavali' | 'crossword' | 'explore';

const NAV_ITEMS: {
  key: NavKey;
  label: string;
  to: '/' | '/padavali' | '/padajala' | '/explore';
}[] = [
  { key: 'home', label: 'Home', to: '/' },
  { key: 'padavali', label: HUB_GAMES.padavali.name, to: '/padavali' },
  { key: 'crossword', label: HUB_GAMES.crossword.name, to: '/padajala' },
  { key: 'explore', label: 'Explore', to: '/explore' }
];

function NavIcon({ navKey }: { navKey: NavKey }) {
  if (navKey === 'home') return <Home className="size-3.5" />;
  if (navKey === 'explore') return <Compass className="size-3.5" />;
  return (
    <Image
      src={GAME_APP_ICON_SRC[HUB_GAMES[navKey].icon]}
      alt=""
      width={14}
      height={14}
      className="size-3.5"
    />
  );
}

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
  const profileLabel = activeGame?.name ?? 'Sanskrit Games';

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 no-underline">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
            <LayoutGrid className="size-4 text-white" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block text-sm font-black tracking-tight text-slate-900 dark:text-slate-50">
              Sanskrit Games
            </span>
            {activeGame ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <Image
                  src={GAME_APP_ICON_SRC[activeGame.icon]}
                  alt=""
                  width={14}
                  height={14}
                  className="size-3.5"
                />
                {activeGame.name}
              </span>
            ) : (
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Play, learn, grow
              </span>
            )}
          </span>
        </Link>

        {activeGame ? (
          <Link
            to={activeGame.href}
            className="flex min-w-0 items-center gap-1.5 no-underline sm:hidden"
          >
            <Image
              src={GAME_APP_ICON_SRC[activeGame.icon]}
              alt=""
              width={22}
              height={22}
              className="size-5.5"
            />
            <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
              {activeGame.name}
            </span>
          </Link>
        ) : (
          <Link to="/" className="truncate text-sm font-black no-underline sm:hidden">
            Sanskrit Games
          </Link>
        )}

        <nav
          aria-label="Games"
          className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="mx-auto flex w-max items-center gap-0.5 rounded-full border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-700/80 dark:bg-slate-900/80">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.key;
              const gamePill =
                item.key === 'padavali' || item.key === 'crossword'
                  ? HUB_GAME_ACCENT[item.key].pill
                  : null;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold no-underline transition-all sm:px-3 sm:text-sm',
                    isActive && gamePill,
                    isActive &&
                      !gamePill &&
                      'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-50',
                    !isActive &&
                      'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                  )}
                >
                  <NavIcon navKey={item.key} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

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

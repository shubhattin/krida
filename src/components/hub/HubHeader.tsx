'use client';

import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Library, SearchIcon } from 'lucide-react';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { UserProfileChip } from '~/components/app-bar/UserProfileChip';
import SupportOptions from '~/components/app-bar/SupportOptions';
import { Button } from '~/components/ui/button';
import { Kbd, KbdGroup } from '~/components/ui/kbd';
import { GameAppIcon } from '~/components/GameAppIcon';
import type { GameKind } from '~/util/catalog/tags';
import type { HubData } from './hub_data';
import { HUB_GAMES } from './hub_games';
import { HubCommandPalette, useHubCommandOpen } from './HubCommandPalette';

export function HubHeader({
  data,
  activeGame,
  showPwaControls = false,
  gameMenuItems
}: {
  data?: HubData;
  activeGame?: GameKind;
  showPwaControls?: boolean;
  gameMenuItems?: ReactNode;
}) {
  const { open, setOpen } = useHubCommandOpen();
  const profileGame = activeGame ?? 'padavali';
  const profileLabel = activeGame ? HUB_GAMES[activeGame].name : 'Sanskrit Games';

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 no-underline">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Library className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm leading-tight font-semibold">
              Sanskrit Games
            </span>
            {activeGame ? (
              <span className="hidden truncate text-[11px] text-muted-foreground sm:block">
                {HUB_GAMES[activeGame].name}
              </span>
            ) : (
              <span className="hidden truncate text-[11px] text-muted-foreground sm:block">
                Library
              </span>
            )}
          </span>
        </Link>

        {activeGame ? (
          <Link
            to={HUB_GAMES[activeGame].href}
            className="hidden items-center no-underline md:flex"
            title={`Play ${HUB_GAMES[activeGame].name}`}
          >
            <GameAppIcon
              game={HUB_GAMES[activeGame].icon}
              name={HUB_GAMES[activeGame].name}
              size="sm"
              className="size-8 rounded-lg"
            />
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-background/80 px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-muted/60 sm:flex"
          aria-keyshortcuts="Meta+K Control+K"
          aria-label="Search puzzles, collections, and topics"
        >
          <SearchIcon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">
            Search puzzles, collections, topics…
          </span>
          <KbdGroup className="hidden lg:inline-flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="sm:hidden"
            aria-label="Search"
            onClick={() => setOpen(true)}
          >
            <SearchIcon />
          </Button>
          <SupportOptions />
          <UserProfileChip game={profileGame} gameLabel={profileLabel} />
          <div className="size-8 shrink-0">
            <MenuButton showPwaControls={showPwaControls} gameMenuItems={gameMenuItems} />
          </div>
        </div>
      </div>
      <HubCommandPalette data={data} open={open} onOpenChange={setOpen} />
    </header>
  );
}

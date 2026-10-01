'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronDown, LayoutGrid, Menu } from 'lucide-react';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { UserProfileChip } from '~/components/app-bar/UserProfileChip';
import SupportOptions from '~/components/app-bar/SupportOptions';
import { GameAppIcon } from '~/components/GameAppIcon';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '~/components/ui/drawer';
import { cn } from '~/lib/utils';
import { HUB_GAME_LIST } from './hub_games';
import { HUB_HEADER_H } from './hub_layout';
import type { GameKind } from '~/util/catalog/tags';

export type HubHeaderProps = {
  overlay?: boolean;
  currentGame?: GameKind;
  showPwaControls?: boolean;
  gameMenuItems?: ReactNode;
};

function useScrolled(offset = 40) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [offset]);

  return scrolled;
}

function navLinkClass(onMedia: boolean, active: boolean) {
  return cn(
    'rounded-md px-2.5 py-1.5 text-sm font-medium no-underline transition-colors',
    onMedia
      ? active
        ? 'text-white'
        : 'text-white/75 hover:text-white'
      : active
        ? 'text-foreground'
        : 'text-muted-foreground hover:text-foreground'
  );
}

export function HubHeader({
  overlay = false,
  currentGame,
  showPwaControls = false,
  gameMenuItems
}: HubHeaderProps) {
  const scrolled = useScrolled();
  const onMedia = overlay && !scrolled;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const view = exploreViewFromSearch(searchStr);

  const isHome = pathname === '/';
  const isCollections =
    pathname.startsWith('/collections') || (pathname === '/explore' && view === 'collections');
  const isExplore = pathname === '/explore' && view !== 'collections';
  const activeGame: GameKind | undefined = currentGame
    ? currentGame
    : pathname.startsWith('/padavali')
      ? 'padavali'
      : pathname.startsWith('/padajala')
        ? 'crossword'
        : undefined;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300',
        HUB_HEADER_H,
        onMedia
          ? 'border-b border-transparent bg-linear-to-b from-black/75 to-transparent text-white'
          : 'border-b border-border/50 bg-background/80 text-foreground shadow-sm backdrop-blur-xl'
      )}
    >
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-2 px-3 sm:px-5 lg:px-8">
        <MobileNav
          onMedia={onMedia}
          isHome={isHome}
          isExplore={isExplore}
          isCollections={isCollections}
          activeGame={activeGame}
        />

        <Link
          to="/"
          className={cn(
            'shrink-0 font-serif text-lg font-bold tracking-tight no-underline sm:text-xl',
            onMedia ? 'text-white' : 'text-foreground'
          )}
        >
          Sanskrit Games
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          <Link to="/" className={navLinkClass(onMedia, isHome)}>
            Home
          </Link>
          <GamesMenu onMedia={onMedia} activeGame={activeGame} />
          <Link
            to="/explore"
            search={{ view: 'puzzles' }}
            className={navLinkClass(onMedia, isExplore)}
          >
            Explore
          </Link>
          <Link
            to="/explore"
            search={{ view: 'collections' }}
            className={navLinkClass(onMedia, isCollections)}
          >
            Collections
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <SupportOptions onMedia={onMedia} shortLabel />
          <UserProfileChip
            game={activeGame === 'crossword' ? 'crossword' : 'padavali'}
            gameLabel="Sanskrit Games"
          />
          <div className="size-8 shrink-0">
            <MenuButton showPwaControls={showPwaControls} gameMenuItems={gameMenuItems} />
          </div>
        </div>
      </div>
    </header>
  );
}

function GamesMenu({ onMedia, activeGame }: { onMedia: boolean; activeGame?: GameKind }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              navLinkClass(onMedia, !!activeGame),
              'inline-flex items-center gap-1 aria-expanded:opacity-100'
            )}
          />
        }
      >
        Games
        <ChevronDown className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-80 p-1.5">
        {HUB_GAME_LIST.map((game, index) => (
          <DropdownMenuGroup key={game.kind}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-2 text-foreground">
              <GameAppIcon
                game={game.icon}
                name={game.name}
                size="sm"
                className="size-10 rounded-xl"
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">{game.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{game.subtitle}</span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuItem
              render={<Link to={game.href} />}
              nativeButton={false}
              className="mx-1 mb-0.5"
            >
              Play {game.name}
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link to="/explore" search={{ game: game.kind, view: 'puzzles' }} />}
              nativeButton={false}
              className="mx-1 mb-1"
            >
              Browse puzzles
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav({
  onMedia,
  isHome,
  isExplore,
  isCollections,
  activeGame
}: {
  onMedia: boolean;
  isHome: boolean;
  isExplore: boolean;
  isCollections: boolean;
  activeGame?: GameKind;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className={cn('lg:hidden', onMedia && 'text-white hover:bg-white/15')}
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader>
          <DrawerTitle>Sanskrit Games</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-1 px-4 pb-8">
          <Link to="/" onClick={close} className={mobileItemClass(isHome)}>
            Home
          </Link>
          <Link
            to="/explore"
            search={{ view: 'puzzles' }}
            onClick={close}
            className={mobileItemClass(isExplore)}
          >
            Explore
          </Link>
          <Link
            to="/explore"
            search={{ view: 'collections' }}
            onClick={close}
            className={mobileItemClass(isCollections)}
          >
            Collections
          </Link>
          <p className="mt-4 mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <LayoutGrid className="size-3.5" />
            Games
          </p>
          {HUB_GAME_LIST.map((game) => (
            <div
              key={game.kind}
              className="flex flex-col gap-1 rounded-xl border border-border/60 p-2"
            >
              <div className="flex items-center gap-2.5 px-1 py-1">
                <GameAppIcon
                  game={game.icon}
                  name={game.name}
                  size="sm"
                  className="size-10 rounded-xl"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{game.name}</p>
                  <p className="text-xs text-muted-foreground">{game.subtitle}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to={game.href}
                  onClick={close}
                  className={mobileItemClass(activeGame === game.kind)}
                >
                  Play
                </Link>
                <Link
                  to="/explore"
                  search={{ game: game.kind, view: 'puzzles' }}
                  onClick={close}
                  className={mobileItemClass(false)}
                >
                  Browse
                </Link>
              </div>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function mobileItemClass(active: boolean) {
  return cn(
    'flex flex-1 items-center rounded-lg px-3 py-2.5 text-sm font-medium no-underline',
    active ? 'bg-muted text-foreground' : 'text-muted-foreground'
  );
}

function exploreViewFromSearch(searchStr: string): 'puzzles' | 'collections' | undefined {
  const params = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr);
  const view = params.get('view');
  if (view === 'collections' || view === 'puzzles') return view;
  return undefined;
}

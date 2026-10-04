'use client';

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, ChevronDown, Compass, Home } from 'lucide-react';
import { Image } from '@unpic/react';
import { Button } from '~/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '~/components/ui/popover';
import { Separator } from '~/components/ui/separator';
import { GAME_APP_ICON_SRC, GameAppIcon } from '~/components/GameAppIcon';
import { cn } from '~/lib/utils';
import {
  HUB_GAME_ACCENT,
  HUB_GAME_LIST,
  HUB_GAMES,
  type HubGameMeta,
  type HubNavId
} from './hub_games';

const PLACES: {
  key: 'home' | 'explore';
  to: '/' | '/explore';
  label: string;
  hint: string;
  icon: typeof Home;
}[] = [
  { key: 'home', to: '/', label: 'Home', hint: 'Hub and today’s puzzles', icon: Home },
  { key: 'explore', to: '/explore', label: 'Explore', hint: 'Every listed puzzle', icon: Compass }
];

function GamesMark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center', className)} aria-hidden="true">
      {HUB_GAME_LIST.slice(0, 2).map((game, index) => (
        <Image
          key={game.kind}
          src={GAME_APP_ICON_SRC[game.icon]}
          alt=""
          width={16}
          height={16}
          className={cn('size-4', index > 0 && '-ml-1')}
        />
      ))}
    </span>
  );
}

function PlaceLink({ place, active }: { place: (typeof PLACES)[number]; active: boolean }) {
  const Icon = place.icon;
  return (
    <Link
      to={place.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-2.5 py-2 no-underline transition-colors',
        active ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">
          {place.label}
        </span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{place.hint}</span>
      </span>
      {active ? <Check className="size-4 shrink-0 text-slate-500" /> : null}
    </Link>
  );
}

function GameNavCard({ game, active }: { game: HubGameMeta; active: boolean }) {
  const accent = HUB_GAME_ACCENT[game.kind];
  return (
    <Link
      to={game.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-2xl border p-2.5 no-underline transition-colors',
        active
          ? cn(accent.border, 'bg-slate-50 dark:bg-slate-900/80')
          : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:hover:border-slate-600 dark:hover:bg-slate-800/60'
      )}
    >
      <span className="flex items-start gap-2">
        <GameAppIcon game={game.icon} name={game.name} size="sm" className="size-10 rounded-xl" />
        {active ? <Check className="ml-auto size-4 shrink-0 text-slate-500" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
          {game.name}
        </span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
          {game.subtitle}
        </span>
      </span>
    </Link>
  );
}

function SwitcherTriggerLabel({ activeGame }: { activeGame: HubGameMeta | null }) {
  if (activeGame) {
    return (
      <>
        <Image
          src={GAME_APP_ICON_SRC[activeGame.icon]}
          alt=""
          width={20}
          height={20}
          className="size-5 shrink-0"
        />
        <span className="truncate">{activeGame.name}</span>
      </>
    );
  }

  return (
    <>
      <GamesMark className="hidden sm:flex" />
      <span className="truncate sm:hidden">Sanskrit Games</span>
      <span className="hidden truncate sm:inline">Games</span>
    </>
  );
}

export function HubNavSwitcher({ active }: { active: HubNavId }) {
  const [open, setOpen] = useState(false);
  const activeGame = active === 'padavali' || active === 'crossword' ? HUB_GAMES[active] : null;
  const triggerLabel = activeGame
    ? `Switch game, currently ${activeGame.name}`
    : 'Open games and pages';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="lg"
            aria-label={triggerLabel}
            className={cn(
              'h-9 max-w-46 min-w-0 gap-1 rounded-full border-slate-200/80 bg-slate-100/80 px-2.5 text-slate-800 shadow-none sm:max-w-xs dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-100',
              activeGame && HUB_GAME_ACCENT[activeGame.kind].border
            )}
          />
        }
      >
        <SwitcherTriggerLabel activeGame={activeGame} />
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 opacity-60 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(20.5rem,calc(100vw-1.5rem))] gap-0 overflow-hidden p-0 sm:w-md"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
        }}
      >
        <PopoverHeader className="px-3 pt-3 pb-2">
          <PopoverTitle>Go to</PopoverTitle>
          <PopoverDescription>Home, catalog, and every game.</PopoverDescription>
        </PopoverHeader>
        <div className="flex flex-col gap-0.5 px-1.5 pb-2">
          {PLACES.map((place) => (
            <PlaceLink key={place.key} place={place} active={active === place.key} />
          ))}
        </div>
        <Separator />
        <div className="flex flex-col gap-2 p-3">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Games
          </p>
          <div className="grid grid-cols-2 gap-2">
            {HUB_GAME_LIST.map((game) => (
              <GameNavCard key={game.kind} game={game} active={active === game.kind} />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ExploreHeaderLink({ active }: { active: boolean }) {
  return (
    <Link
      to="/explore"
      aria-current={active ? 'page' : undefined}
      aria-label="Explore"
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold no-underline transition-colors',
        active
          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      )}
    >
      <Compass className="size-4 shrink-0" />
      <span className="hidden sm:inline">Explore</span>
    </Link>
  );
}

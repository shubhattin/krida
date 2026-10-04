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
import { HUB_GAME_LIST, HUB_GAMES, type HubGameMeta, type HubNavId } from './hub_games';

const PLACES: {
  key: 'home' | 'explore';
  to: '/' | '/explore';
  label: string;
  hint: string;
  icon: typeof Home;
}[] = [
  { key: 'home', to: '/', label: 'Home', hint: 'Hub and today’s puzzles', icon: Home },
  { key: 'explore', to: '/explore', label: 'Explore', hint: 'Every puzzle', icon: Compass }
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

const PLACE_ACTIVE = {
  home: {
    row: 'bg-slate-200/90 ring-1 ring-slate-300/80 dark:bg-slate-700 dark:ring-slate-500/80',
    icon: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
    check: 'text-slate-800 dark:text-slate-200'
  },
  explore: {
    row: 'bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-950/80 dark:ring-indigo-500/50',
    icon: 'bg-indigo-600 text-white',
    check: 'text-indigo-600 dark:text-indigo-300'
  }
} as const;

const GAME_CARD_ACTIVE = {
  padavali: {
    card: 'border-blue-300 bg-blue-50 shadow-sm dark:border-blue-500/45 dark:bg-blue-950/55',
    check: 'text-blue-600 dark:text-blue-300'
  },
  crossword: {
    card: 'border-amber-300 bg-amber-50 shadow-sm dark:border-amber-500/45 dark:bg-amber-950/40',
    check: 'text-amber-600 dark:text-amber-300'
  }
} as const;

const SWITCHER_TRIGGER_GAME = {
  padavali:
    'border-blue-300 bg-blue-50 text-slate-900 dark:border-blue-500/50 dark:bg-blue-950/70 dark:text-slate-50',
  crossword:
    'border-amber-300 bg-amber-50 text-slate-900 dark:border-amber-500/50 dark:bg-amber-950/60 dark:text-slate-50'
} as const;

function PlaceLink({ place, active }: { place: (typeof PLACES)[number]; active: boolean }) {
  const Icon = place.icon;
  const selected = active ? PLACE_ACTIVE[place.key] : null;
  return (
    <Link
      to={place.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-2.5 py-2 no-underline transition-colors',
        selected ? selected.row : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
      )}
    >
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-lg',
          selected
            ? selected.icon
            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">
          {place.label}
        </span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{place.hint}</span>
      </span>
      {selected ? <Check className={cn('size-4 shrink-0', selected.check)} /> : null}
    </Link>
  );
}

function GameNavCard({ game, active }: { game: HubGameMeta; active: boolean }) {
  const selected = active ? GAME_CARD_ACTIVE[game.kind] : null;
  return (
    <Link
      to={game.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-2xl border p-2.5 no-underline transition-colors',
        selected
          ? selected.card
          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600 dark:hover:bg-slate-800/70'
      )}
    >
      <span className="flex items-start gap-2">
        <GameAppIcon game={game.icon} name={game.name} size="sm" className="size-10 rounded-xl" />
        {selected ? <Check className={cn('ml-auto size-4 shrink-0', selected.check)} /> : null}
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
      <span className="truncate">Krida</span>
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
              'h-9 max-w-46 min-w-0 gap-1 rounded-full px-2.5 shadow-none sm:max-w-xs',
              activeGame
                ? SWITCHER_TRIGGER_GAME[activeGame.kind]
                : 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
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
        className="w-[min(20.5rem,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-xl sm:w-md dark:border-slate-700 dark:bg-slate-800"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
        }}
      >
        <PopoverHeader className="px-3 pt-3 pb-2">
          <PopoverTitle className="text-slate-900 dark:text-slate-50">Go to</PopoverTitle>
          <PopoverDescription className="text-slate-500 dark:text-slate-400">
            Home, catalog, and every game.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex flex-col gap-0.5 px-1.5 pb-2">
          {PLACES.map((place) => (
            <PlaceLink key={place.key} place={place} active={active === place.key} />
          ))}
        </div>
        <Separator className="bg-slate-200 dark:bg-slate-700" />
        <div className="flex flex-col gap-2 bg-slate-50/90 p-3 dark:bg-slate-900/40">
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

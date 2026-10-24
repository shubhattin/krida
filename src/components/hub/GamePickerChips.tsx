'use client';

import { LayoutGroup, motion } from 'framer-motion';
import { LayoutGridIcon } from 'lucide-react';
import { GameKindIcon } from '~/components/pages/catalog/GameKindIcon';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';
import { isSimpleGameKind, SIMPLE_GAME_META } from '~/util/games/kinds';
import { HUB_GAMES } from './hub_games';

export type GamePick = 'all' | GameKind;

/** Player-facing game name (with diacritics), e.g. Padāvalī, Dvayī. */
export function gameDisplayName(game: GameKind) {
  return isSimpleGameKind(game) ? SIMPLE_GAME_META[game].name : HUB_GAMES[game].name;
}

/**
 * Game filter that fits every game on one row without scrolling. On phones, inactive chips
 * collapse to their icon and only the selected chip shows its name + count; from `sm` up every
 * chip is labelled (from `lg` with `compactUntil="lg"`, for rows that share their width).
 * (Wraps as a last resort if a wide screen ever runs out of room.)
 */
export function GamePickerChips({
  games,
  value,
  onChange,
  counts,
  compactUntil = 'sm',
  className
}: {
  games: readonly GameKind[];
  value: GamePick;
  onChange: (value: GamePick) => void;
  counts?: Partial<Record<GamePick, number>>;
  /** Breakpoint below which inactive chips collapse to their icon. */
  compactUntil?: 'sm' | 'lg';
  className?: string;
}) {
  const options: GamePick[] = ['all', ...games];
  const untilLg = compactUntil === 'lg';

  return (
    <LayoutGroup>
      <div
        role="group"
        aria-label="Filter by game"
        className={cn('flex flex-wrap items-center gap-1 sm:gap-2', className)}
      >
        {options.map((option) => {
          const active = option === value;
          const count = counts?.[option];
          const label = option === 'all' ? 'All' : gameDisplayName(option);
          return (
            <motion.button
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              key={option}
              type="button"
              aria-pressed={active}
              aria-label={count === undefined ? label : `${label} (${count})`}
              title={label}
              onClick={() => onChange(option)}
              className={cn(
                'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full border text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none sm:h-8',
                active
                  ? 'px-2.5 sm:px-3'
                  : untilLg
                    ? 'w-7 sm:w-8 lg:w-auto lg:px-3'
                    : 'w-7 sm:w-auto sm:px-3',
                active
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-600'
              )}
            >
              {option === 'all' ? (
                <LayoutGridIcon className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <GameKindIcon game={option} className="size-4" />
              )}
              <span
                className={cn(
                  'whitespace-nowrap',
                  !active && (untilLg ? 'max-lg:hidden' : 'max-sm:hidden')
                )}
              >
                {label}
              </span>
              {count !== undefined ? (
                <span
                  className={cn(
                    'tabular-nums opacity-60 max-sm:hidden',
                    !active && untilLg && 'max-lg:hidden'
                  )}
                >
                  {count}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

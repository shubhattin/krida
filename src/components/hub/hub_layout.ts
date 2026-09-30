import type { GameKind } from '~/util/catalog/tags';

/** Pull a section out of the root layout's horizontal page padding. */
export const HUB_FULL_BLEED = 'relative sm:-mx-2 lg:-mx-3 xl:-mx-4 2xl:-mx-4';

export const HUB_HEADER_H = 'h-16';

export const GAME_ACCENT = {
  padavali: 'from-blue-500 to-indigo-600',
  crossword: 'from-amber-500 to-orange-600'
} as const satisfies Record<GameKind, string>;

export const GAME_BADGE = {
  padavali:
    'border-blue-400/40 bg-blue-500/90 text-white shadow-blue-950/30 dark:border-blue-300/30 dark:bg-blue-500/85',
  crossword:
    'border-amber-400/40 bg-amber-500/90 text-zinc-950 shadow-amber-950/30 dark:border-amber-300/30 dark:bg-amber-400/90'
} as const satisfies Record<GameKind, string>;

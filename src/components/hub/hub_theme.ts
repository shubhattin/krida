import type { GameKind } from '~/util/catalog/tags';

export const HUB_GAME_THEME = {
  padavali: {
    wash: 'bg-blue-50 dark:bg-blue-950/40',
    ink: 'text-blue-800 dark:text-blue-200',
    muted: 'text-blue-700/80 dark:text-blue-300/80',
    ring: 'ring-blue-200/70 dark:ring-blue-800/50',
    overlay: 'from-blue-950/20 via-blue-950/55 to-blue-950/90',
    play: 'bg-white text-blue-900 hover:bg-blue-50',
    badge: 'bg-blue-600 text-white'
  },
  crossword: {
    wash: 'bg-amber-50 dark:bg-amber-950/35',
    ink: 'text-amber-900 dark:text-amber-200',
    muted: 'text-amber-800/80 dark:text-amber-300/80',
    ring: 'ring-amber-200/70 dark:ring-amber-800/50',
    overlay: 'from-amber-950/15 via-stone-950/55 to-stone-950/90',
    play: 'bg-white text-amber-950 hover:bg-amber-50',
    badge: 'bg-amber-600 text-white'
  }
} as const satisfies Record<GameKind, Record<string, string>>;

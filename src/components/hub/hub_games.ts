import type { GameAppIconId } from '~/components/GameAppIcon';
import type { GameKind } from '~/util/catalog/tags';

export type HubGameMeta = {
  kind: GameKind;
  /** Icon / URL id — Padajala routes live under `/padajala`. */
  icon: GameAppIconId;
  name: string;
  subtitle: string;
  description: string;
  href: '/padavali' | '/padajala';
  puzzlesHref: '/padavali/puzzles' | '/padajala/puzzles';
};

export const HUB_GAMES = {
  padavali: {
    kind: 'padavali',
    icon: 'padavali',
    name: 'Padāvalī',
    subtitle: 'Word Search',
    description: 'Find hidden Sanskrit words by dragging across a grid of letters.',
    href: '/padavali',
    puzzlesHref: '/padavali/puzzles'
  },
  crossword: {
    kind: 'crossword',
    icon: 'padajala',
    name: 'Padajāla',
    subtitle: 'Crossword',
    description: 'Solve Sanskrit crossword puzzles and expand your vocabulary.',
    href: '/padajala',
    puzzlesHref: '/padajala/puzzles'
  }
} as const satisfies Record<GameKind, HubGameMeta>;

export const HUB_GAME_LIST: HubGameMeta[] = [HUB_GAMES.padavali, HUB_GAMES.crossword];

export const puzzleHref = (game: GameKind, slug: string) =>
  `${HUB_GAMES[game].href}/${encodeURIComponent(slug)}`;

export type HubNavId = 'home' | 'padavali' | 'crossword' | 'explore';

export function hubNavFromPath(pathname: string): HubNavId {
  if (pathname.startsWith('/padavali')) return 'padavali';
  if (pathname.startsWith('/padajala')) return 'crossword';
  if (pathname.startsWith('/explore') || pathname.startsWith('/collections')) return 'explore';
  return 'home';
}

export const HUB_GAME_ACCENT = {
  padavali: {
    badge: 'border-blue-300/70 bg-blue-600 text-white dark:border-blue-400/40 dark:bg-blue-500',
    pill: 'bg-blue-600 text-white shadow-blue-500/25 dark:bg-blue-500',
    border: 'border-blue-200/70 dark:border-blue-800/50',
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'bg-blue-500/15 dark:bg-blue-400/10',
    cta: 'bg-linear-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/20'
  },
  crossword: {
    badge: 'border-amber-300/70 bg-amber-500 text-white dark:border-amber-400/40 dark:bg-amber-500',
    pill: 'bg-amber-500 text-white shadow-amber-500/25 dark:bg-amber-500',
    border: 'border-amber-200/70 dark:border-amber-800/50',
    gradient: 'from-amber-500 to-orange-600',
    glow: 'bg-amber-500/15 dark:bg-amber-400/10',
    cta: 'bg-linear-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/20'
  }
} as const;

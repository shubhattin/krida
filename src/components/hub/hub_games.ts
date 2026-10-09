import type { GameAppIconId } from '~/components/GameAppIcon';
import type { GameKind } from '~/util/catalog/tags';
import {
  isSimpleGameKind,
  simpleGameHref,
  type PublicGameKind
} from '~/util/games/kinds';

export type HubGameMeta = {
  kind: PublicGameKind;
  /** Icon / URL id — Padajala routes live under `/padajala`. */
  icon: GameAppIconId;
  name: string;
  subtitle: string;
  description: string;
  href: '/padavali' | '/padajala';
  /** Puzzle catalog filter for this game (`?game=`). */
  puzzlesGame: PublicGameKind;
};

export const HUB_GAMES = {
  padavali: {
    kind: 'padavali',
    icon: 'padavali',
    name: 'Padāvalī',
    subtitle: 'Word Search',
    description: 'Find hidden Sanskrit words by dragging across a grid of letters.',
    href: '/padavali',
    puzzlesGame: 'padavali'
  },
  crossword: {
    kind: 'crossword',
    icon: 'padajala',
    name: 'Padajāla',
    subtitle: 'Crossword',
    description: 'Solve Sanskrit crossword puzzles and expand your vocabulary.',
    href: '/padajala',
    puzzlesGame: 'crossword'
  }
} as const satisfies Record<PublicGameKind, HubGameMeta>;

export const HUB_GAME_LIST: HubGameMeta[] = [HUB_GAMES.padavali, HUB_GAMES.crossword];

export const puzzleHref = (game: GameKind, slug: string) => {
  if (isSimpleGameKind(game)) return simpleGameHref(game, slug);
  return `${HUB_GAMES[game].href}/${encodeURIComponent(slug)}`;
};

export type HubNavId = 'home' | 'padavali' | 'crossword' | 'puzzles';

export function hubNavFromPath(pathname: string): HubNavId {
  if (pathname.startsWith('/padavali')) return 'padavali';
  if (pathname.startsWith('/padajala')) return 'crossword';
  if (pathname.startsWith('/puzzles') || pathname.startsWith('/collections')) return 'puzzles';
  return 'home';
}

export const HUB_GAME_ACCENT = {
  padavali: {
    badge: 'border-blue-300/70 bg-blue-600 text-white dark:border-blue-400/40 dark:bg-blue-500',
    iconWell:
      'border-blue-200/80 shadow-blue-500/20 dark:border-blue-500/35 dark:shadow-blue-900/40',
    pill: 'bg-blue-600 text-white shadow-blue-500/25 dark:bg-blue-500',
    border: 'border-blue-200/70 dark:border-blue-800/50',
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'bg-blue-500/15 dark:bg-blue-400/10',
    cta: 'bg-linear-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/20'
  },
  crossword: {
    badge: 'border-amber-300/70 bg-amber-500 text-white dark:border-amber-400/40 dark:bg-amber-500',
    iconWell:
      'border-amber-200/80 shadow-amber-500/25 dark:border-amber-500/40 dark:shadow-amber-900/40',
    pill: 'bg-amber-500 text-white shadow-amber-500/25 dark:bg-amber-500',
    border: 'border-amber-200/70 dark:border-amber-800/50',
    gradient: 'from-amber-500 to-orange-600',
    glow: 'bg-amber-500/15 dark:bg-amber-400/10',
    cta: 'bg-linear-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/20'
  }
} as const;

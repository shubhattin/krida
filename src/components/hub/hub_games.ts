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

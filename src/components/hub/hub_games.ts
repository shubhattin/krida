import { GAME_KINDS, isGameKind, type GameKind } from '~/util/catalog/tags';
import { SIMPLE_GAME_KINDS, SIMPLE_GAME_META, type SimpleGameKind } from '~/util/games/kinds';

export type HubGameMeta = {
  kind: GameKind;
  name: string;
  subtitle: string;
  description: string;
};

const simpleHubGame = (kind: SimpleGameKind): HubGameMeta => {
  const { name, subtitle, description } = SIMPLE_GAME_META[kind];
  return { kind, name, subtitle, description };
};

export const HUB_GAMES = {
  padavali: {
    kind: 'padavali',
    name: 'Padāvalī',
    subtitle: 'Word Search',
    description: 'Find hidden Sanskrit words by dragging across a grid of letters.'
  },
  padajala: {
    kind: 'padajala',
    name: 'Padajāla',
    subtitle: 'Padajala',
    description: 'Solve Sanskrit padajala puzzles and expand your vocabulary.'
  },
  // SAFETY: keyed by exactly SIMPLE_GAME_KINDS, so every simple kind gets one entry.
  ...(Object.fromEntries(SIMPLE_GAME_KINDS.map((kind) => [kind, simpleHubGame(kind)])) as Record<
    SimpleGameKind,
    HubGameMeta
  >)
} satisfies Record<GameKind, HubGameMeta>;

export const HUB_GAME_LIST: HubGameMeta[] = GAME_KINDS.map((kind) => HUB_GAMES[kind]);

/** Public URL of one puzzle (every game serves puzzles at `/<game>/<slug>`). */
export const puzzleHref = (game: GameKind, slug: string) => `/${game}/${encodeURIComponent(slug)}`;

export type HubNavId = 'home' | GameKind | 'puzzles';

export function hubNavFromPath(pathname: string): HubNavId {
  if (pathname.startsWith('/puzzles') || pathname.startsWith('/collections')) return 'puzzles';
  const segment = pathname.split('/')[1] ?? '';
  return isGameKind(segment) ? segment : 'home';
}

/** Home `#` anchors for deep-linking into the puzzles section (`/#padavali`, `/#dvayi`, …). */
export type HubHomeHash = 'puzzles' | GameKind;

/** Map hub filter value → home page hash (`/#padavali`, `/#dvayi`, …). */
export function hubHomeHashForGame(game: 'all' | GameKind): HubHomeHash {
  return game === 'all' ? 'puzzles' : game;
}

/** Parse `/#dvayi` / `/#puzzles` into the home puzzles filter. */
export function hubGameFromHomeHash(hash: string): 'all' | GameKind | null {
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  if (id === 'puzzles') return 'all';
  return isGameKind(id) ? id : null;
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
  padajala: {
    badge: 'border-amber-300/70 bg-amber-500 text-white dark:border-amber-400/40 dark:bg-amber-500',
    iconWell:
      'border-amber-200/80 shadow-amber-500/25 dark:border-amber-500/40 dark:shadow-amber-900/40',
    pill: 'bg-amber-500 text-white shadow-amber-500/25 dark:bg-amber-500',
    border: 'border-amber-200/70 dark:border-amber-800/50',
    gradient: 'from-amber-500 to-orange-600',
    glow: 'bg-amber-500/15 dark:bg-amber-400/10',
    cta: 'bg-linear-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/20'
  },
  dvayi: {
    badge: 'border-rose-300/70 bg-rose-500 text-white dark:border-rose-400/40 dark:bg-rose-500',
    iconWell:
      'border-rose-200/80 shadow-rose-500/20 dark:border-rose-500/35 dark:shadow-rose-900/40',
    pill: 'bg-rose-500 text-white shadow-rose-500/25 dark:bg-rose-500',
    border: 'border-rose-200/70 dark:border-rose-800/50',
    gradient: 'from-rose-500 to-orange-600',
    glow: 'bg-rose-500/15 dark:bg-rose-400/10',
    cta: 'bg-linear-to-r from-rose-500 to-orange-600 text-white shadow-rose-500/20'
  },
  bhramita: {
    badge:
      'border-emerald-300/70 bg-emerald-600 text-white dark:border-emerald-400/40 dark:bg-emerald-500',
    iconWell:
      'border-emerald-200/80 shadow-emerald-500/20 dark:border-emerald-500/35 dark:shadow-emerald-900/40',
    pill: 'bg-emerald-600 text-white shadow-emerald-500/25 dark:bg-emerald-500',
    border: 'border-emerald-200/70 dark:border-emerald-800/50',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'bg-emerald-500/15 dark:bg-emerald-400/10',
    cta: 'bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20'
  },
  surupa: {
    badge:
      'border-violet-300/70 bg-violet-600 text-white dark:border-violet-400/40 dark:bg-violet-500',
    iconWell:
      'border-violet-200/80 shadow-violet-500/20 dark:border-violet-500/35 dark:shadow-violet-900/40',
    pill: 'bg-violet-600 text-white shadow-violet-500/25 dark:bg-violet-500',
    border: 'border-violet-200/70 dark:border-violet-800/50',
    gradient: 'from-violet-500 to-fuchsia-600',
    glow: 'bg-violet-500/15 dark:bg-violet-400/10',
    cta: 'bg-linear-to-r from-violet-500 to-fuchsia-600 text-white shadow-violet-500/20'
  },
  anveshi: {
    badge: 'border-sky-300/70 bg-sky-600 text-white dark:border-sky-400/40 dark:bg-sky-500',
    iconWell: 'border-sky-200/80 shadow-sky-500/20 dark:border-sky-500/35 dark:shadow-sky-900/40',
    pill: 'bg-sky-600 text-white shadow-sky-500/25 dark:bg-sky-500',
    border: 'border-sky-200/70 dark:border-sky-800/50',
    gradient: 'from-sky-500 to-indigo-600',
    glow: 'bg-sky-500/15 dark:bg-sky-400/10',
    cta: 'bg-linear-to-r from-sky-500 to-indigo-600 text-white shadow-sky-500/20'
  }
} as const;

import { GAME_KINDS, type GameKind } from '~/util/catalog/tags';

/**
 * Progressive krida release: Padāvalī and Padajāla are established games and are
 * always shown in public listings. The four new kridas (dvayi, bhramita, surupa,
 * anveshi) are only ever mentioned in public UI once they have at least one
 * listed puzzle. Admin surfaces intentionally ignore this and list everything.
 */
export const ALWAYS_VISIBLE_GAMES = ['padavali', 'padajala'] as const satisfies readonly [
  GameKind,
  GameKind
];

const ALWAYS_VISIBLE_SET: ReadonlySet<GameKind> = new Set(ALWAYS_VISIBLE_GAMES);

export function isAlwaysVisibleGame(game: GameKind): boolean {
  return ALWAYS_VISIBLE_SET.has(game);
}

/**
 * Public game list in `GAME_KINDS` order: old games always, new games only when
 * their listed-puzzle count is positive. O(6) — callers already hold the lists,
 * so this adds no DB queries; `hubData$` derives it from list lengths.
 */
export function visibleGamesFromCounts(counts: Record<GameKind, number>): GameKind[] {
  return GAME_KINDS.filter((game) => isAlwaysVisibleGame(game) || (counts[game] ?? 0) > 0);
}

/** Games for a public per-game layout: always-visible games plus the game itself. */
export function publicLayoutGames(kind: GameKind): GameKind[] {
  return GAME_KINDS.filter((game) => game === kind || isAlwaysVisibleGame(game));
}

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'] as const;

/** `6` → `"six"` (falls back to the numeral past six). */
export function countWord(count: number): string {
  return COUNT_WORDS[count] ?? String(count);
}

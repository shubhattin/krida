import type { GameKind } from '~/util/catalog/tags';
import { SIMPLE_GAME_META } from './kinds';

export const GAME_KIND_LABEL: Record<GameKind, string> = {
  padavali: 'Padavali',
  crossword: 'Padajala',
  dvayi: SIMPLE_GAME_META.dvayi.name,
  bhramita: SIMPLE_GAME_META.bhramita.name,
  surupa: SIMPLE_GAME_META.surupa.name,
  anveshi: SIMPLE_GAME_META.anveshi.name
};

export function gameKindLabel(game: GameKind) {
  return GAME_KIND_LABEL[game];
}

export function formatGameCounts(items: { game: GameKind }[]) {
  const counts = items.reduce<Partial<Record<GameKind, number>>>((acc, item) => {
    acc[item.game] = (acc[item.game] ?? 0) + 1;
    return acc;
  }, {});
  const parts = (Object.entries(counts) as [GameKind, number][])
    .filter(([, count]) => count > 0)
    .map(([game, count]) => `${count} ${GAME_KIND_LABEL[game]}`);
  return parts.join(' · ');
}

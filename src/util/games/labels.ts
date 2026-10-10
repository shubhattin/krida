import { GAME_KINDS, type GameKind } from '~/util/catalog/tags';
import { SIMPLE_GAME_META } from './kinds';

export const GAME_KIND_LABEL = {
  padavali: 'Padavali',
  crossword: 'Padajala',
  dvayi: SIMPLE_GAME_META.dvayi.name,
  bhramita: SIMPLE_GAME_META.bhramita.name,
  surupa: SIMPLE_GAME_META.surupa.name,
  anveshi: SIMPLE_GAME_META.anveshi.name
} as const satisfies Record<GameKind, string>;

export function gameKindLabel(game: GameKind) {
  return GAME_KIND_LABEL[game];
}

export function formatGameCounts(items: { game: GameKind }[]) {
  const counts = items.reduce<Partial<Record<GameKind, number>>>((acc, item) => {
    acc[item.game] = (acc[item.game] ?? 0) + 1;
    return acc;
  }, {});
  return GAME_KINDS.flatMap((game) => {
    const count = counts[game];
    return count && count > 0 ? [`${count} ${GAME_KIND_LABEL[game]}`] : [];
  }).join(' · ');
}

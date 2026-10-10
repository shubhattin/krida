import { ArrowLeftRight, CircleHelp, Shuffle, SpellCheck } from 'lucide-react';
import type { SimpleGameKind } from '~/util/games/kinds';

export const SIMPLE_GAME_ICONS = {
  dvayi: ArrowLeftRight,
  bhramita: Shuffle,
  surupa: SpellCheck,
  anveshi: CircleHelp
} as const satisfies Record<SimpleGameKind, typeof ArrowLeftRight>;

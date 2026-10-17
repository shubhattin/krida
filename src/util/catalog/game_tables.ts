import {
  anveshi_puzzles,
  bhramita_puzzles,
  crossword_puzzles,
  dvayi_puzzles,
  padavali_puzzles,
  surupa_puzzles
} from '~/db/schema';
import type { GameKind } from './tags';

/** Payload tables. Listing columns live on `puzzles`. */
export const payloadTable = {
  padavali: padavali_puzzles,
  crossword: crossword_puzzles,
  dvayi: dvayi_puzzles,
  bhramita: bhramita_puzzles,
  surupa: surupa_puzzles,
  anveshi: anveshi_puzzles
} as const satisfies Record<GameKind, unknown>;

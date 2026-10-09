import {
  anveshi_collection_items,
  anveshi_puzzle_tags,
  anveshi_puzzles,
  bhramita_collection_items,
  bhramita_puzzle_tags,
  bhramita_puzzles,
  crossword_collection_items,
  crossword_puzzle_tags,
  crossword_puzzles,
  dvayi_collection_items,
  dvayi_puzzle_tags,
  dvayi_puzzles,
  padavali_collection_items,
  padavali_puzzle_tags,
  padavali_puzzles,
  surupa_collection_items,
  surupa_puzzle_tags,
  surupa_puzzles
} from '~/db/schema';
import type { GameKind } from './tags';

export const puzzleTable = {
  padavali: padavali_puzzles,
  crossword: crossword_puzzles,
  dvayi: dvayi_puzzles,
  bhramita: bhramita_puzzles,
  surupa: surupa_puzzles,
  anveshi: anveshi_puzzles
} as const;

export const tagLinkTable = {
  padavali: padavali_puzzle_tags,
  crossword: crossword_puzzle_tags,
  dvayi: dvayi_puzzle_tags,
  bhramita: bhramita_puzzle_tags,
  surupa: surupa_puzzle_tags,
  anveshi: anveshi_puzzle_tags
} as const;

export const itemTable = {
  padavali: padavali_collection_items,
  crossword: crossword_collection_items,
  dvayi: dvayi_collection_items,
  bhramita: bhramita_collection_items,
  surupa: surupa_collection_items,
  anveshi: anveshi_collection_items
} as const;

export const TAG_LINK_SQL = {
  padavali: 'padavali_puzzle_tags',
  crossword: 'crossword_puzzle_tags',
  dvayi: 'dvayi_puzzle_tags',
  bhramita: 'bhramita_puzzle_tags',
  surupa: 'surupa_puzzle_tags',
  anveshi: 'anveshi_puzzle_tags'
} as const satisfies Record<GameKind, string>;

export const ITEM_SQL = {
  padavali: 'padavali_collection_items',
  crossword: 'crossword_collection_items',
  dvayi: 'dvayi_collection_items',
  bhramita: 'bhramita_collection_items',
  surupa: 'surupa_collection_items',
  anveshi: 'anveshi_collection_items'
} as const satisfies Record<GameKind, string>;

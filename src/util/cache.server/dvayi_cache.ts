import { dvayi_tables } from '~/db/schema/dvayi_schema';
import { dvayi_puzzle_data_schema, type DvayiPuzzleData } from '~/util/dvayi/data';
import {
  createSimpleGameCacheLoaders,
  simpleGameCacheKeys,
  type SimpleGameCacheLoaders,
  type SimpleGamePuzzle
} from './simple_game_cache';

export type DvayiPuzzleType = SimpleGamePuzzle<DvayiPuzzleData>;

export const dvayiCacheKeys = simpleGameCacheKeys('dvayi');

export const dvayi_cache_loaders: SimpleGameCacheLoaders<DvayiPuzzleData> =
  createSimpleGameCacheLoaders('dvayi', dvayi_tables, dvayi_puzzle_data_schema);

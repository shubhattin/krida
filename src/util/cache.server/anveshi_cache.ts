import { anveshi_tables } from '~/db/schema/anveshi_schema';
import { anveshi_puzzle_data_schema, type AnveshiPuzzleData } from '~/util/anveshi/data';
import {
  createSimpleGameCacheLoaders,
  simpleGameCacheKeys,
  type SimpleGameCacheLoaders,
  type SimpleGamePuzzle
} from './simple_game_cache';

export type AnveshiPuzzleType = SimpleGamePuzzle<AnveshiPuzzleData>;

export const anveshiCacheKeys = simpleGameCacheKeys('anveshi');

export const anveshi_cache_loaders: SimpleGameCacheLoaders<AnveshiPuzzleData> =
  createSimpleGameCacheLoaders('anveshi', anveshi_tables, anveshi_puzzle_data_schema);

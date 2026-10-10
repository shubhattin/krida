import { surupa_tables } from '~/db/schema/surupa_schema';
import { surupa_puzzle_data_schema, type SurupaPuzzleData } from '~/util/surupa/data';
import {
  createSimpleGameCacheLoaders,
  simpleGameCacheKeys,
  type SimpleGameCacheLoaders,
  type SimpleGamePuzzle
} from './simple_game_cache';

export type SurupaPuzzleType = SimpleGamePuzzle<SurupaPuzzleData>;

export const surupaCacheKeys = simpleGameCacheKeys('surupa');

export const surupa_cache_loaders: SimpleGameCacheLoaders<SurupaPuzzleData> =
  createSimpleGameCacheLoaders('surupa', surupa_tables, surupa_puzzle_data_schema);

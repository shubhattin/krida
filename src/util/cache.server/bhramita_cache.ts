import { bhramita_tables } from '~/db/schema/bhramita_schema';
import { bhramita_puzzle_data_schema, type BhramitaPuzzleData } from '~/util/bhramita/data';
import {
  createSimpleGameCacheLoaders,
  simpleGameCacheKeys,
  type SimpleGameCacheLoaders,
  type SimpleGamePuzzle
} from './simple_game_cache';

export type BhramitaPuzzleType = SimpleGamePuzzle<BhramitaPuzzleData>;

export const bhramitaCacheKeys = simpleGameCacheKeys('bhramita');

export const bhramita_cache_loaders: SimpleGameCacheLoaders<BhramitaPuzzleData> =
  createSimpleGameCacheLoaders('bhramita', bhramita_tables, bhramita_puzzle_data_schema);

import { surupa_tables } from '~/db/schema/surupa_schema';
import { surupa_cache_loaders } from '~/util/cache.server/surupa_cache';
import { surupa_puzzle_data_schema, emptySurupaPuzzleData } from '~/util/surupa/data';
import { inferSurupaPuzzleData } from '~/util/surupa/infer';
import { analyzeSurupaPuzzle } from '~/util/surupa/validate';
import { createSimpleGameRouter } from './simple_game/puzzle_routes';

export const surupa_router = createSimpleGameRouter({
  kind: 'surupa',
  tables: surupa_tables,
  cache: surupa_cache_loaders,
  dataSchema: surupa_puzzle_data_schema,
  emptyData: emptySurupaPuzzleData(),
  infer: inferSurupaPuzzleData,
  analyze: analyzeSurupaPuzzle
});

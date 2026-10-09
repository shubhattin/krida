import { anveshi_tables } from '~/db/schema/anveshi_schema';
import { anveshi_cache_loaders } from '~/util/cache.server/anveshi_cache';
import { anveshi_puzzle_data_schema, emptyAnveshiPuzzleData } from '~/util/anveshi/data';
import { inferAnveshiPuzzleData } from '~/util/anveshi/infer';
import { analyzeAnveshiPuzzle } from '~/util/anveshi/validate';
import { createSimpleGameRouter } from './simple_game/puzzle_routes';

export const anveshi_router = createSimpleGameRouter({
  kind: 'anveshi',
  tables: anveshi_tables,
  cache: anveshi_cache_loaders,
  dataSchema: anveshi_puzzle_data_schema,
  emptyData: emptyAnveshiPuzzleData(),
  infer: inferAnveshiPuzzleData,
  analyze: analyzeAnveshiPuzzle
});

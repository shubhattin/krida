import { anveshi_tables } from '~/db/schema/anveshi_schema';
import { anveshi_puzzle_data_schema, emptyAnveshiPuzzleData } from '~/util/anveshi/data';
import { inferAnveshiPuzzleData } from '~/util/anveshi/infer';
import { analyzeAnveshiPuzzle } from '~/util/anveshi/validate';
import { createSimpleGameRouter } from './simple_game/puzzle_routes';

export const anveshi_router = createSimpleGameRouter({
  kind: 'anveshi',
  tables: anveshi_tables,
  dataSchema: anveshi_puzzle_data_schema,
  emptyData: emptyAnveshiPuzzleData(),
  infer: inferAnveshiPuzzleData,
  analyze: analyzeAnveshiPuzzle
});

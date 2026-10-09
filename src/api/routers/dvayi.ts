import { dvayi_tables } from '~/db/schema/dvayi_schema';
import { dvayi_puzzle_data_schema, emptyDvayiPuzzleData } from '~/util/dvayi/data';
import { inferDvayiPuzzleData } from '~/util/dvayi/infer';
import { analyzeDvayiPuzzle } from '~/util/dvayi/validate';
import { createSimpleGameRouter } from './simple_game/puzzle_routes';

export const dvayi_router = createSimpleGameRouter({
  kind: 'dvayi',
  tables: dvayi_tables,
  dataSchema: dvayi_puzzle_data_schema,
  emptyData: emptyDvayiPuzzleData(),
  infer: inferDvayiPuzzleData,
  analyze: analyzeDvayiPuzzle
});

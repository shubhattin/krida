import { surupa_tables } from '~/db/schema/surupa_schema';
import { surupa_puzzle_data_schema, emptySurupaPuzzleData } from '~/util/surupa/data';
import { inferSurupaPuzzleData } from '~/util/surupa/infer';
import { analyzeSurupaPuzzle } from '~/util/surupa/validate';
import { createSimpleGameRouter } from './simple_game/puzzle_routes';

export const surupa_router = createSimpleGameRouter({
  kind: 'surupa',
  tables: surupa_tables,
  dataSchema: surupa_puzzle_data_schema,
  emptyData: emptySurupaPuzzleData(),
  infer: inferSurupaPuzzleData,
  analyze: analyzeSurupaPuzzle
});

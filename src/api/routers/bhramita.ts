import { bhramita_tables } from '~/db/schema/bhramita_schema';
import { bhramita_cache_loaders } from '~/util/cache.server/bhramita_cache';
import { bhramita_puzzle_data_schema, emptyBhramitaPuzzleData } from '~/util/bhramita/data';
import { inferBhramitaPuzzleData } from '~/util/bhramita/infer';
import { analyzeBhramitaPuzzle } from '~/util/bhramita/validate';
import { createSimpleGameRouter } from './simple_game/puzzle_routes';

export const bhramita_router = createSimpleGameRouter({
  kind: 'bhramita',
  tables: bhramita_tables,
  cache: bhramita_cache_loaders,
  dataSchema: bhramita_puzzle_data_schema,
  emptyData: emptyBhramitaPuzzleData(),
  infer: inferBhramitaPuzzleData,
  analyze: analyzeBhramitaPuzzle
});

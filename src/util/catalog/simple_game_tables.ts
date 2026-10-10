import { anveshi_tables } from '~/db/schema/anveshi_schema';
import { bhramita_tables } from '~/db/schema/bhramita_schema';
import { dvayi_tables } from '~/db/schema/dvayi_schema';
import { surupa_tables } from '~/db/schema/surupa_schema';
import type { SimpleGameTableSet } from '~/db/schema/simple_game_tables';
import type { SimpleGameKind } from '~/util/games/kinds';

export const SIMPLE_GAME_TABLES = {
  dvayi: dvayi_tables,
  bhramita: bhramita_tables,
  surupa: surupa_tables,
  anveshi: anveshi_tables
} as const satisfies Record<SimpleGameKind, SimpleGameTableSet<unknown>>;

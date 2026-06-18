import * as schema from './schema';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type drizzleDbType = NeonDatabase<typeof schema> | PostgresJsDatabase<typeof schema>;

export type pgTransactionType =
  | PgTransaction<NeonQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>
  | PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;

export type TxOrDb = pgTransactionType | drizzleDbType;

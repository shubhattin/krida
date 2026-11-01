import * as schema from './schema';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type drizzleDbType = PostgresJsDatabase<typeof schema>;

export type pgTransactionType = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type TxOrDb = pgTransactionType | drizzleDbType;

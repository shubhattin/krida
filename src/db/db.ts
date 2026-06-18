import * as schema from './schema';
import { drizzle as drizzle_neon } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { get_db_url } from './db_utils';
import type { pgTransactionType } from './db_types';

export type { drizzleDbType, pgTransactionType, TxOrDb } from './db_types';

const DB_URL = get_db_url(process.env);

const get_drizzle_instance_dev = async () => {
  // using local postgres to allow edge environment in the edge
  const postgres = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  return drizzle(postgres.default(DB_URL), { schema });
};

export const db =
  process.env.NODE_ENV === 'development'
    ? await get_drizzle_instance_dev()
    : drizzle_neon(new Pool({ connectionString: DB_URL }), { schema });

export type transactionType = pgTransactionType | typeof db;

import dotenv from 'dotenv';
import * as schema from '../schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { dbMode } from '../../tools/kry.server';

dotenv.config({ path: '../../../.env' });

const DB_URL = {
  LOCAL: process.env.PG_DATABASE_URL!,
  PROD: process.env.PG_DATABASE_URL1!,
  PREVIEW: process.env.PG_DATABASE_URL2!
}[dbMode];

export const queryClient = postgres(DB_URL!);
export const dbClient_ext = drizzle(queryClient, { schema });

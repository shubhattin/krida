import * as schema from './schema';
import { drizzle as drizzle_neon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { get_db_url } from './db_utils';

const DB_URL = get_db_url(process.env);

export const db = drizzle_neon(neon(DB_URL), { schema });

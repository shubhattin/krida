import { z } from 'zod';
import { resolveDbUrl } from '~/effect/config';

/** Resolve Postgres URL for Drizzle Kit / scripts (non-Effect boundary). */
export const get_db_url = (env: NodeJS.ProcessEnv): string => {
  const url = resolveDbUrl(env);
  const url_parse = z
    .string({
      message: 'Connection string for PostgreSQL'
    })
    .safeParse(url);
  if (!url_parse.success) throw new Error('Please set `PG_DATABASE_URL`');
  return url_parse.data;
};

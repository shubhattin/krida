import { tool } from 'ai';
import { z } from 'zod';
import { runReadonlyQuery } from '~/agents/sql/run_readonly_query';
import type { SqlQueryInput, SqlQueryOutput } from '~/agents/ui_message';
import { runToolEffect } from './run_tool_effect';

export const sqlQueryTool = tool<SqlQueryInput, SqlQueryOutput>({
  description:
    'Run one read-only PostgreSQL SELECT (or WITH … SELECT) against the live database. Returns columns and up to 200 rows.',
  inputSchema: z.object({
    purpose: z
      .string()
      .describe('A few words on what this query finds, e.g. "Plays per game this week"'),
    query: z.string().describe('A single PostgreSQL SELECT statement')
  }),
  execute: ({ query }) => runToolEffect(runReadonlyQuery(query))
});

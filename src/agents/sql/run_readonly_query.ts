import { Effect } from 'effect';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { dbTransaction } from '~/effect/database';
import { BadRequestError } from '~/effect/errors';
import type { SqlQueryOutput } from '~/agents/ui_message';
import { guardSelectQuery } from './sql_guard';

const MAX_ROWS = 200;
/** Rough cap on what goes back into the model's context. */
const MAX_OUTPUT_CHARS = 40_000;
const MAX_CELL_CHARS = 2_000;
const STATEMENT_TIMEOUT = '8s';

const clip = (text: string) =>
  text.length > MAX_CELL_CHARS ? `${text.slice(0, MAX_CELL_CHARS)}…` : text;

/** A driver value as a `SqlCell`: ISO dates, bigint and JSON as text, long text clipped. */
const cell_schema = z.union([
  z
    .null()
    .or(z.undefined())
    .transform(() => null),
  z.date().transform((date) => date.toISOString()),
  z.bigint().transform(String),
  z.string().transform(clip),
  z.number(),
  z.boolean(),
  z.unknown().transform((value) => clip(JSON.stringify(value)))
]);

const rows_schema = z.array(z.record(z.string(), cell_schema));

/** postgres.js returns the rows array; the Neon pool returns `{ rows }`. */
const result_schema = z.union([
  rows_schema,
  z.object({ rows: rows_schema }).transform((r) => r.rows)
]);

/**
 * Run an agent-written SELECT: static guard → READ ONLY transaction with a statement timeout →
 * row and size caps. Postgres rejects any write that slips past the guard.
 */
export const runReadonlyQuery = Effect.fn('agents.run_readonly_query')(function* (raw: string) {
  const guarded = guardSelectQuery(raw);
  if (!guarded.ok) {
    return yield* Effect.fail(BadRequestError.make({ message: guarded.reason }));
  }

  const started = Date.now();
  const rows = yield* dbTransaction('agents.readonly_query', async (tx) => {
    await tx.execute(sql`SET TRANSACTION READ ONLY`);
    await tx.execute(sql.raw(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT}'`));
    const result = await tx.execute(
      sql.raw(`SELECT * FROM (${guarded.query}\n) AS agent_query LIMIT ${MAX_ROWS + 1}`)
    );
    return result_schema.parse(result);
  });

  let truncated = rows.length > MAX_ROWS;
  const kept = rows.slice(0, MAX_ROWS);
  const columns = kept[0] ? Object.keys(kept[0]) : [];
  let table = kept.map((row) => columns.map((column) => row[column] ?? null));

  while (table.length > 1 && JSON.stringify(table).length > MAX_OUTPUT_CHARS) {
    table = table.slice(0, Math.ceil(table.length / 2));
    truncated = true;
  }

  return {
    columns,
    rows: table,
    row_count: table.length,
    truncated,
    duration_ms: Date.now() - started
  } satisfies SqlQueryOutput;
});

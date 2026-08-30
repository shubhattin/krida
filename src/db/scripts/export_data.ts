import { dbClient_ext, queryClient } from './client';
import { readFile } from 'fs/promises';
import { dbMode, take_input } from '~/tools/kry.server';
import {
  padavali_schedules,
  padavali_gameplay_stats,
  padavali_puzzles,
  padavali_sessions,
  padavali_attachments,
  ai_batch_responses,
  ai_batches,
  padavali_redirects,
  image_assets,
  crossword_puzzles,
  crossword_redirects,
  crossword_attachments,
  crossword_sessions,
  crossword_gameplay_stats,
  crossword_schedules
} from '~/db/schema';
import {
  PadavaliPuzzleSchemaZod,
  PadavaliAttachmentSchemaZod,
  PadavaliGamePlayStatsSchemaZod,
  PadavaliScheduleSchemaZod,
  PadavaliSessionSchemaZod,
  AiBatchResponseSchemaZod,
  AiBatchSchemaZod,
  PadavaliRedirectSchemaZod,
  ImageAssetSchemaZod,
  CrossordPuzzleSchemaZod,
  CrosswordRedirectSchemaZod,
  CrosswordAttachmentSchemaZod,
  CrosswordSessionSchemaZod,
  CrosswordGamePlayStatsSchemaZod,
  CrosswordScheduleSchemaZod
} from '~/db/schema_zod';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import chalk from 'chalk';

type ExportTx = Parameters<Parameters<typeof dbClient_ext.transaction>[0]>[0];

const ExportDataSchema = z.object({
  padavali_puzzles: PadavaliPuzzleSchemaZod.array(),
  padavali_gameplay_stats: PadavaliGamePlayStatsSchemaZod.array(),
  padavali_schedules: PadavaliScheduleSchemaZod.array(),
  padavali_sessions: PadavaliSessionSchemaZod.array(),
  padavali_attachments: PadavaliAttachmentSchemaZod.array(),
  padavali_redirects: PadavaliRedirectSchemaZod.array(),
  crossword_puzzles: CrossordPuzzleSchemaZod.array(),
  // New crossword satellite tables default to [] for older backups
  crossword_redirects: CrosswordRedirectSchemaZod.array().default([]),
  crossword_attachments: CrosswordAttachmentSchemaZod.array().default([]),
  crossword_sessions: CrosswordSessionSchemaZod.array().default([]),
  crossword_gameplay_stats: CrosswordGamePlayStatsSchemaZod.array().default([]),
  crossword_schedules: CrosswordScheduleSchemaZod.array().default([]),
  ai_batch_responses: AiBatchResponseSchemaZod.array(),
  ai_batches: AiBatchSchemaZod.array(),
  image_assets: ImageAssetSchemaZod.array()
});

type ExportData = z.infer<typeof ExportDataSchema>;

// Order: children first (stats → sessions → schedules/attachments/redirects → puzzles)
async function deleteAllTables(tx: ExportTx): Promise<void> {
  try {
    await tx.delete(padavali_gameplay_stats);
    await tx.delete(padavali_sessions);
    await tx.delete(padavali_schedules);
    await tx.delete(padavali_attachments);
    await tx.delete(padavali_redirects);
    await tx.delete(padavali_puzzles);
    await tx.delete(crossword_gameplay_stats);
    await tx.delete(crossword_sessions);
    await tx.delete(crossword_schedules);
    await tx.delete(crossword_attachments);
    await tx.delete(crossword_redirects);
    await tx.delete(crossword_puzzles);
    await tx.delete(ai_batch_responses);
    await tx.delete(ai_batches);
    await tx.delete(image_assets);
    console.log(chalk.green('✓ Deleted All Tables Successfully'));
  } catch (e) {
    console.log(chalk.red('✗ Error while deleting tables:'), chalk.yellow(e));
  }
}

async function insertChunked<T extends PgTable>(
  tx: ExportTx,
  table: T,
  rows: T['$inferInsert'][]
): Promise<void> {
  for (const chunk of chunkArray(rows, 5000)) {
    await tx.insert(table).values(chunk);
  }
}

async function insertSimpleData(tx: ExportTx, data: ExportData): Promise<void> {
  // inserting image_assets
  try {
    await tx.insert(image_assets).values(data.image_assets);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`image_assets`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting image_assets:'), chalk.yellow(e));
  }

  // inserting padavali_puzzles
  try {
    await tx.insert(padavali_puzzles).values(data.padavali_puzzles);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`padavali_puzzles`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting padavali_puzzles:'), chalk.yellow(e));
  }

  // inserting crossword_puzzles
  try {
    await tx.insert(crossword_puzzles).values(data.crossword_puzzles);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`crossword_puzzles`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting crossword_puzzles:'), chalk.yellow(e));
  }

  // inserting padavali_redirects
  try {
    await tx.insert(padavali_redirects).values(data.padavali_redirects);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`padavali_redirects`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting padavali_redirects:'), chalk.yellow(e));
  }

  // inserting crossword_redirects
  try {
    await tx.insert(crossword_redirects).values(data.crossword_redirects);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`crossword_redirects`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting crossword_redirects:'), chalk.yellow(e));
  }

  // inserting padavali_attachments
  try {
    await tx.insert(padavali_attachments).values(data.padavali_attachments);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`padavali_attachments`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting padavali_attachments:'), chalk.yellow(e));
  }

  // inserting crossword_attachments
  try {
    await tx.insert(crossword_attachments).values(data.crossword_attachments);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`crossword_attachments`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting crossword_attachments:'), chalk.yellow(e));
  }

  // inserting padavali_schedules
  try {
    await tx.insert(padavali_schedules).values(data.padavali_schedules);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`padavali_schedules`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting padavali_schedules:'), chalk.yellow(e));
  }

  // inserting crossword_schedules
  try {
    await tx.insert(crossword_schedules).values(data.crossword_schedules);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`crossword_schedules`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting crossword_schedules:'), chalk.yellow(e));
  }
}

async function insertChunkedData(tx: ExportTx, data: ExportData): Promise<void> {
  // inserting padavali_sessions
  try {
    await insertChunked(tx, padavali_sessions, data.padavali_sessions);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`padavali_sessions`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting padavali_sessions:'), chalk.yellow(e));
  }

  // inserting crossword_sessions
  try {
    await insertChunked(tx, crossword_sessions, data.crossword_sessions);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`crossword_sessions`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting crossword_sessions:'), chalk.yellow(e));
  }

  // inserting padavali_gameplay_stats
  try {
    await insertChunked(tx, padavali_gameplay_stats, data.padavali_gameplay_stats);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`padavali_gameplay_stats`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting padavali_gameplay_stats:'), chalk.yellow(e));
  }

  // inserting crossword_gameplay_stats
  try {
    await insertChunked(tx, crossword_gameplay_stats, data.crossword_gameplay_stats);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`crossword_gameplay_stats`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting crossword_gameplay_stats:'), chalk.yellow(e));
  }
}

// resetting SERIAL (sequences renamed to match tables in 0017_rename_owned_sequences)
async function resetSerialSequences(tx: ExportTx): Promise<void> {
  try {
    await tx.execute(
      sql`SELECT setval('"padavali_puzzles_id_seq"', (select MAX(id) from "padavali_puzzles"))`
    );
    await tx.execute(
      sql`SELECT setval('"crossword_puzzles_id_seq"', (select MAX(id) from "crossword_puzzles"))`
    );
    await tx.execute(
      sql`SELECT setval('"padavali_attachments_id_seq"', (select MAX(id) from "padavali_attachments"))`
    );
    await tx.execute(
      sql`SELECT setval('"padavali_gameplay_stats_id_seq"', (select MAX(id) from "padavali_gameplay_stats"))`
    );
    await tx.execute(
      sql`SELECT setval('"padavali_schedules_id_seq"', (select MAX(id) from "padavali_schedules"))`
    );
    await tx.execute(
      sql`SELECT setval('"padavali_sessions_id_seq"', (select MAX(id) from "padavali_sessions"))`
    );
    await tx.execute(
      sql`SELECT setval('"padavali_redirects_id_seq"', (select MAX(id) from "padavali_redirects"))`
    );
    await tx.execute(
      sql`SELECT setval('"crossword_attachments_id_seq"', (select MAX(id) from "crossword_attachments"))`
    );
    await tx.execute(
      sql`SELECT setval('"crossword_gameplay_stats_id_seq"', (select MAX(id) from "crossword_gameplay_stats"))`
    );
    await tx.execute(
      sql`SELECT setval('"crossword_schedules_id_seq"', (select MAX(id) from "crossword_schedules"))`
    );
    await tx.execute(
      sql`SELECT setval('"crossword_sessions_id_seq"', (select MAX(id) from "crossword_sessions"))`
    );
    await tx.execute(
      sql`SELECT setval('"crossword_redirects_id_seq"', (select MAX(id) from "crossword_redirects"))`
    );
    await tx.execute(
      sql`SELECT setval('"image_assets_id_seq"', (select MAX(id) from "image_assets"))`
    );
    console.log(chalk.green('✓ Successfully resetted ALL SERIAL'));
  } catch (e) {
    console.log(chalk.red('✗ Error while resetting SERIAL:'), chalk.yellow(e));
  }
}

const main = async () => {
  /*
   Better backup & restore tools like `pg_dump` and `pg_restore` should be used.
   
   Although Here the foriegn key relations are not that complex so we are doing it manually
  */
  if (!(await confirm_environemnt())) return;

  console.log(`Insering Data into ${dbMode} Database...`);

  const in_file_name = {
    PROD: 'db_data_prod.json',
    PREVIEW: 'db_data_preview.json',
    LOCAL: 'db_data.json'
  }[dbMode];

  const data = ExportDataSchema.parse(
    JSON.parse((await readFile(`./out/${in_file_name}`)).toString())
  );

  await dbClient_ext.transaction(async (tx) => {
    // deleting all the tables initially
    await deleteAllTables(tx);
    await insertSimpleData(tx, data);
    await insertChunkedData(tx, data);
    await resetSerialSequences(tx);
  });
};
main().then(() => {
  queryClient.end();
});

async function confirm_environemnt() {
  const confirmation: string = await take_input(`Are you sure INSERT in ${dbMode} ? `);
  if (['yes', 'y'].includes(confirmation)) return true;
  return false;
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

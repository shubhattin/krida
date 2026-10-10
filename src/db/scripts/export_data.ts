import { dbClient_ext, dbDataFileName, queryClient } from './client';
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
  crossword_schedules,
  tags,
  collections,
  padavali_puzzle_tags,
  crossword_puzzle_tags,
  padavali_collection_items,
  crossword_collection_items,
  dvayi_puzzles,
  dvayi_redirects,
  dvayi_attachments,
  dvayi_sessions,
  dvayi_gameplay_stats,
  dvayi_puzzle_tags,
  dvayi_collection_items,
  bhramita_puzzles,
  bhramita_redirects,
  bhramita_attachments,
  bhramita_sessions,
  bhramita_gameplay_stats,
  bhramita_puzzle_tags,
  bhramita_collection_items,
  surupa_puzzles,
  surupa_redirects,
  surupa_attachments,
  surupa_sessions,
  surupa_gameplay_stats,
  surupa_puzzle_tags,
  surupa_collection_items,
  anveshi_puzzles,
  anveshi_redirects,
  anveshi_attachments,
  anveshi_sessions,
  anveshi_gameplay_stats,
  anveshi_puzzle_tags,
  anveshi_collection_items
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
  CrosswordScheduleSchemaZod,
  TagSchemaZod,
  CollectionSchemaZod,
  PadavaliPuzzleTagSchemaZod,
  CrosswordPuzzleTagSchemaZod,
  PadavaliCollectionItemSchemaZod,
  CrosswordCollectionItemSchemaZod,
  DvayiPuzzleSchemaZod,
  DvayiRedirectSchemaZod,
  DvayiAttachmentSchemaZod,
  DvayiSessionSchemaZod,
  DvayiGamePlayStatsSchemaZod,
  DvayiPuzzleTagSchemaZod,
  DvayiCollectionItemSchemaZod,
  BhramitaPuzzleSchemaZod,
  BhramitaRedirectSchemaZod,
  BhramitaAttachmentSchemaZod,
  BhramitaSessionSchemaZod,
  BhramitaGamePlayStatsSchemaZod,
  BhramitaPuzzleTagSchemaZod,
  BhramitaCollectionItemSchemaZod,
  SurupaPuzzleSchemaZod,
  SurupaRedirectSchemaZod,
  SurupaAttachmentSchemaZod,
  SurupaSessionSchemaZod,
  SurupaGamePlayStatsSchemaZod,
  SurupaPuzzleTagSchemaZod,
  SurupaCollectionItemSchemaZod,
  AnveshiPuzzleSchemaZod,
  AnveshiRedirectSchemaZod,
  AnveshiAttachmentSchemaZod,
  AnveshiSessionSchemaZod,
  AnveshiGamePlayStatsSchemaZod,
  AnveshiPuzzleTagSchemaZod,
  AnveshiCollectionItemSchemaZod
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
  image_assets: ImageAssetSchemaZod.array(),
  // Catalog tables default to [] so older JSON dumps still restore
  tags: TagSchemaZod.array().default([]),
  collections: CollectionSchemaZod.array().default([]),
  padavali_puzzle_tags: PadavaliPuzzleTagSchemaZod.array().default([]),
  crossword_puzzle_tags: CrosswordPuzzleTagSchemaZod.array().default([]),
  padavali_collection_items: PadavaliCollectionItemSchemaZod.array().default([]),
  crossword_collection_items: CrosswordCollectionItemSchemaZod.array().default([]),
  // Simple games default to [] so older JSON dumps still restore
  dvayi_puzzles: DvayiPuzzleSchemaZod.array().default([]),
  dvayi_redirects: DvayiRedirectSchemaZod.array().default([]),
  dvayi_attachments: DvayiAttachmentSchemaZod.array().default([]),
  dvayi_sessions: DvayiSessionSchemaZod.array().default([]),
  dvayi_gameplay_stats: DvayiGamePlayStatsSchemaZod.array().default([]),
  dvayi_puzzle_tags: DvayiPuzzleTagSchemaZod.array().default([]),
  dvayi_collection_items: DvayiCollectionItemSchemaZod.array().default([]),
  bhramita_puzzles: BhramitaPuzzleSchemaZod.array().default([]),
  bhramita_redirects: BhramitaRedirectSchemaZod.array().default([]),
  bhramita_attachments: BhramitaAttachmentSchemaZod.array().default([]),
  bhramita_sessions: BhramitaSessionSchemaZod.array().default([]),
  bhramita_gameplay_stats: BhramitaGamePlayStatsSchemaZod.array().default([]),
  bhramita_puzzle_tags: BhramitaPuzzleTagSchemaZod.array().default([]),
  bhramita_collection_items: BhramitaCollectionItemSchemaZod.array().default([]),
  surupa_puzzles: SurupaPuzzleSchemaZod.array().default([]),
  surupa_redirects: SurupaRedirectSchemaZod.array().default([]),
  surupa_attachments: SurupaAttachmentSchemaZod.array().default([]),
  surupa_sessions: SurupaSessionSchemaZod.array().default([]),
  surupa_gameplay_stats: SurupaGamePlayStatsSchemaZod.array().default([]),
  surupa_puzzle_tags: SurupaPuzzleTagSchemaZod.array().default([]),
  surupa_collection_items: SurupaCollectionItemSchemaZod.array().default([]),
  anveshi_puzzles: AnveshiPuzzleSchemaZod.array().default([]),
  anveshi_redirects: AnveshiRedirectSchemaZod.array().default([]),
  anveshi_attachments: AnveshiAttachmentSchemaZod.array().default([]),
  anveshi_sessions: AnveshiSessionSchemaZod.array().default([]),
  anveshi_gameplay_stats: AnveshiGamePlayStatsSchemaZod.array().default([]),
  anveshi_puzzle_tags: AnveshiPuzzleTagSchemaZod.array().default([]),
  anveshi_collection_items: AnveshiCollectionItemSchemaZod.array().default([])
});

type ExportData = z.infer<typeof ExportDataSchema>;

// Order: children first (stats → sessions → schedules/attachments/redirects →
// tag/collection links → puzzles → collections/tags → batches → images)
async function deleteAllTables(tx: ExportTx): Promise<void> {
  try {
    await tx.delete(padavali_gameplay_stats);
    await tx.delete(padavali_sessions);
    await tx.delete(padavali_schedules);
    await tx.delete(padavali_attachments);
    await tx.delete(padavali_redirects);
    await tx.delete(padavali_puzzle_tags);
    await tx.delete(padavali_collection_items);
    await tx.delete(padavali_puzzles);
    await tx.delete(crossword_gameplay_stats);
    await tx.delete(crossword_sessions);
    await tx.delete(crossword_schedules);
    await tx.delete(crossword_attachments);
    await tx.delete(crossword_redirects);
    await tx.delete(crossword_puzzle_tags);
    await tx.delete(crossword_collection_items);
    await tx.delete(crossword_puzzles);
    await tx.delete(dvayi_gameplay_stats);
    await tx.delete(dvayi_sessions);
    await tx.delete(dvayi_attachments);
    await tx.delete(dvayi_redirects);
    await tx.delete(dvayi_puzzle_tags);
    await tx.delete(dvayi_collection_items);
    await tx.delete(dvayi_puzzles);
    await tx.delete(bhramita_gameplay_stats);
    await tx.delete(bhramita_sessions);
    await tx.delete(bhramita_attachments);
    await tx.delete(bhramita_redirects);
    await tx.delete(bhramita_puzzle_tags);
    await tx.delete(bhramita_collection_items);
    await tx.delete(bhramita_puzzles);
    await tx.delete(surupa_gameplay_stats);
    await tx.delete(surupa_sessions);
    await tx.delete(surupa_attachments);
    await tx.delete(surupa_redirects);
    await tx.delete(surupa_puzzle_tags);
    await tx.delete(surupa_collection_items);
    await tx.delete(surupa_puzzles);
    await tx.delete(anveshi_gameplay_stats);
    await tx.delete(anveshi_sessions);
    await tx.delete(anveshi_attachments);
    await tx.delete(anveshi_redirects);
    await tx.delete(anveshi_puzzle_tags);
    await tx.delete(anveshi_collection_items);
    await tx.delete(anveshi_puzzles);
    await tx.delete(collections);
    await tx.delete(tags);
    await tx.delete(ai_batch_responses);
    await tx.delete(ai_batches);
    await tx.delete(image_assets);
    console.log(chalk.green('✓ Deleted All Tables Successfully'));
  } catch (e) {
    console.log(chalk.red('✗ Error while deleting tables:'), chalk.yellow(e));
  }
}

async function insertIfAny<T extends PgTable>(
  tx: ExportTx,
  table: T,
  rows: T['$inferInsert'][],
  name: string
): Promise<void> {
  if (rows.length === 0) {
    console.log(chalk.green('✓ No rows for'), chalk.blue(`\`${name}\``));
    return;
  }
  try {
    await tx.insert(table).values(rows);
    console.log(chalk.green('✓ Successfully added values into table'), chalk.blue(`\`${name}\``));
  } catch (e) {
    console.log(chalk.red(`✗ Error while inserting ${name}:`), chalk.yellow(e));
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

async function insertChunkedIfAny<T extends PgTable>(
  tx: ExportTx,
  table: T,
  rows: T['$inferInsert'][],
  name: string
): Promise<void> {
  if (rows.length === 0) {
    console.log(chalk.green('✓ No rows for'), chalk.blue(`\`${name}\``));
    return;
  }
  try {
    await insertChunked(tx, table, rows);
    console.log(chalk.green('✓ Successfully added values into table'), chalk.blue(`\`${name}\``));
  } catch (e) {
    console.log(chalk.red(`✗ Error while inserting ${name}:`), chalk.yellow(e));
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

  await insertIfAny(tx, dvayi_puzzles, data.dvayi_puzzles, 'dvayi_puzzles');
  await insertIfAny(tx, bhramita_puzzles, data.bhramita_puzzles, 'bhramita_puzzles');
  await insertIfAny(tx, surupa_puzzles, data.surupa_puzzles, 'surupa_puzzles');
  await insertIfAny(tx, anveshi_puzzles, data.anveshi_puzzles, 'anveshi_puzzles');

  await insertIfAny(tx, tags, data.tags, 'tags');
  await insertIfAny(tx, collections, data.collections, 'collections');
  await insertIfAny(tx, padavali_puzzle_tags, data.padavali_puzzle_tags, 'padavali_puzzle_tags');
  await insertIfAny(tx, crossword_puzzle_tags, data.crossword_puzzle_tags, 'crossword_puzzle_tags');
  await insertIfAny(
    tx,
    padavali_collection_items,
    data.padavali_collection_items,
    'padavali_collection_items'
  );
  await insertIfAny(
    tx,
    crossword_collection_items,
    data.crossword_collection_items,
    'crossword_collection_items'
  );
  await insertIfAny(tx, dvayi_puzzle_tags, data.dvayi_puzzle_tags, 'dvayi_puzzle_tags');
  await insertIfAny(tx, bhramita_puzzle_tags, data.bhramita_puzzle_tags, 'bhramita_puzzle_tags');
  await insertIfAny(tx, surupa_puzzle_tags, data.surupa_puzzle_tags, 'surupa_puzzle_tags');
  await insertIfAny(tx, anveshi_puzzle_tags, data.anveshi_puzzle_tags, 'anveshi_puzzle_tags');
  await insertIfAny(
    tx,
    dvayi_collection_items,
    data.dvayi_collection_items,
    'dvayi_collection_items'
  );
  await insertIfAny(
    tx,
    bhramita_collection_items,
    data.bhramita_collection_items,
    'bhramita_collection_items'
  );
  await insertIfAny(
    tx,
    surupa_collection_items,
    data.surupa_collection_items,
    'surupa_collection_items'
  );
  await insertIfAny(
    tx,
    anveshi_collection_items,
    data.anveshi_collection_items,
    'anveshi_collection_items'
  );

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

  await insertIfAny(tx, dvayi_redirects, data.dvayi_redirects, 'dvayi_redirects');
  await insertIfAny(tx, bhramita_redirects, data.bhramita_redirects, 'bhramita_redirects');
  await insertIfAny(tx, surupa_redirects, data.surupa_redirects, 'surupa_redirects');
  await insertIfAny(tx, anveshi_redirects, data.anveshi_redirects, 'anveshi_redirects');
  await insertIfAny(tx, dvayi_attachments, data.dvayi_attachments, 'dvayi_attachments');
  await insertIfAny(tx, bhramita_attachments, data.bhramita_attachments, 'bhramita_attachments');
  await insertIfAny(tx, surupa_attachments, data.surupa_attachments, 'surupa_attachments');
  await insertIfAny(tx, anveshi_attachments, data.anveshi_attachments, 'anveshi_attachments');

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

  await insertChunkedIfAny(tx, dvayi_sessions, data.dvayi_sessions, 'dvayi_sessions');
  await insertChunkedIfAny(tx, bhramita_sessions, data.bhramita_sessions, 'bhramita_sessions');
  await insertChunkedIfAny(tx, surupa_sessions, data.surupa_sessions, 'surupa_sessions');
  await insertChunkedIfAny(tx, anveshi_sessions, data.anveshi_sessions, 'anveshi_sessions');
  await insertChunkedIfAny(
    tx,
    dvayi_gameplay_stats,
    data.dvayi_gameplay_stats,
    'dvayi_gameplay_stats'
  );
  await insertChunkedIfAny(
    tx,
    bhramita_gameplay_stats,
    data.bhramita_gameplay_stats,
    'bhramita_gameplay_stats'
  );
  await insertChunkedIfAny(
    tx,
    surupa_gameplay_stats,
    data.surupa_gameplay_stats,
    'surupa_gameplay_stats'
  );
  await insertChunkedIfAny(
    tx,
    anveshi_gameplay_stats,
    data.anveshi_gameplay_stats,
    'anveshi_gameplay_stats'
  );
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
    await tx.execute(sql`SELECT setval('"tags_id_seq"', (select MAX(id) from "tags"))`);
    await tx.execute(
      sql`SELECT setval('"collections_id_seq"', (select MAX(id) from "collections"))`
    );
    for (const table of [
      'dvayi_puzzles',
      'dvayi_attachments',
      'dvayi_gameplay_stats',
      'dvayi_sessions',
      'dvayi_redirects',
      'bhramita_puzzles',
      'bhramita_attachments',
      'bhramita_gameplay_stats',
      'bhramita_sessions',
      'bhramita_redirects',
      'surupa_puzzles',
      'surupa_attachments',
      'surupa_gameplay_stats',
      'surupa_sessions',
      'surupa_redirects',
      'anveshi_puzzles',
      'anveshi_attachments',
      'anveshi_gameplay_stats',
      'anveshi_sessions',
      'anveshi_redirects'
    ] as const) {
      await tx.execute(
        sql.raw(`SELECT setval('"${table}_id_seq"', (select MAX(id) from "${table}"))`)
      );
    }
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

  const in_file_name = dbDataFileName;

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

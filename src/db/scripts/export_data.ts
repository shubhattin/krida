import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import { sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { dbClient_ext, dbDataFileName, queryClient } from './client';
import { dbMode, take_input } from '~/tools/kry.server';
import {
  ai_batch_responses,
  ai_batches,
  anveshi_puzzles,
  attempt_gameplay_stats,
  bhramita_puzzles,
  collection_items,
  collections,
  crossword_gameplay_stats,
  crossword_puzzles,
  dvayi_puzzles,
  image_assets,
  padavali_puzzles,
  puzzle_attachments,
  puzzle_redirects,
  puzzle_schedules,
  puzzle_sessions,
  puzzle_tags,
  puzzles,
  surupa_puzzles,
  tags
} from '~/db/schema';
import {
  AiBatchResponseSchemaZod,
  AiBatchSchemaZod,
  AnveshiPuzzleSchemaZod,
  AttemptGamePlayStatsSchemaZod,
  BhramitaPuzzleSchemaZod,
  CollectionItemSchemaZod,
  CollectionSchemaZod,
  CrosswordGamePlayStatsSchemaZod,
  CrossordPuzzleSchemaZod,
  DvayiPuzzleSchemaZod,
  ImageAssetSchemaZod,
  PadavaliPuzzleSchemaZod,
  PuzzleAttachmentSchemaZod,
  PuzzleRedirectSchemaZod,
  PuzzleScheduleSchemaZod,
  PuzzleSchemaZod,
  PuzzleSessionSchemaZod,
  PuzzleTagSchemaZod,
  SurupaPuzzleSchemaZod,
  TagSchemaZod
} from '~/db/schema_zod';

type ExportTx = Parameters<Parameters<typeof dbClient_ext.transaction>[0]>[0];

const ExportDataSchema = z.object({
  image_assets: z.array(ImageAssetSchemaZod),
  tags: z.array(TagSchemaZod),
  collections: z.array(CollectionSchemaZod),
  ai_batches: z.array(AiBatchSchemaZod),
  ai_batch_responses: z.array(AiBatchResponseSchemaZod),
  puzzles: z.array(PuzzleSchemaZod),
  padavali_puzzles: z.array(PadavaliPuzzleSchemaZod),
  crossword_puzzles: z.array(CrossordPuzzleSchemaZod),
  dvayi_puzzles: z.array(DvayiPuzzleSchemaZod),
  bhramita_puzzles: z.array(BhramitaPuzzleSchemaZod),
  surupa_puzzles: z.array(SurupaPuzzleSchemaZod),
  anveshi_puzzles: z.array(AnveshiPuzzleSchemaZod),
  puzzle_tags: z.array(PuzzleTagSchemaZod),
  collection_items: z.array(CollectionItemSchemaZod),
  puzzle_redirects: z.array(PuzzleRedirectSchemaZod),
  puzzle_attachments: z.array(PuzzleAttachmentSchemaZod),
  puzzle_schedules: z.array(PuzzleScheduleSchemaZod),
  puzzle_sessions: z.array(PuzzleSessionSchemaZod),
  attempt_gameplay_stats: z.array(AttemptGamePlayStatsSchemaZod),
  crossword_gameplay_stats: z.array(CrosswordGamePlayStatsSchemaZod)
});

type ExportData = z.infer<typeof ExportDataSchema>;

const SERIAL_TABLES = [
  'image_assets',
  'tags',
  'collections',
  'puzzles',
  'puzzle_redirects',
  'puzzle_attachments',
  'puzzle_schedules',
  'puzzle_sessions',
  'attempt_gameplay_stats',
  'crossword_gameplay_stats'
] as const;

async function deleteAllTables(tx: ExportTx): Promise<void> {
  await tx.delete(attempt_gameplay_stats);
  await tx.delete(crossword_gameplay_stats);
  await tx.delete(puzzle_sessions);
  await tx.delete(puzzle_schedules);
  await tx.delete(puzzle_attachments);
  await tx.delete(puzzle_redirects);
  await tx.delete(puzzle_tags);
  await tx.delete(collection_items);
  await tx.delete(padavali_puzzles);
  await tx.delete(crossword_puzzles);
  await tx.delete(dvayi_puzzles);
  await tx.delete(bhramita_puzzles);
  await tx.delete(surupa_puzzles);
  await tx.delete(anveshi_puzzles);
  await tx.delete(puzzles);
  await tx.delete(collections);
  await tx.delete(tags);
  await tx.delete(ai_batch_responses);
  await tx.delete(ai_batches);
  await tx.delete(image_assets);
  console.log(chalk.green('✓ Deleted all tables'));
}

async function insertChunked<T extends PgTable>(
  tx: ExportTx,
  table: T,
  rows: T['$inferInsert'][]
): Promise<void> {
  for (const chunk of chunkArray(rows, 2000)) {
    await tx.insert(table).values(chunk);
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
  const chunked =
    name === 'puzzle_sessions' ||
    name === 'attempt_gameplay_stats' ||
    name === 'crossword_gameplay_stats';
  if (chunked) await insertChunked(tx, table, rows);
  else await tx.insert(table).values(rows);
  console.log(chalk.green('✓ Inserted'), chalk.blue(`\`${name}\``), rows.length);
}

async function insertAll(tx: ExportTx, data: ExportData): Promise<void> {
  await insertIfAny(tx, image_assets, data.image_assets, 'image_assets');
  await insertIfAny(tx, tags, data.tags, 'tags');
  await insertIfAny(tx, collections, data.collections, 'collections');
  await insertIfAny(
    tx,
    ai_batches,
    data.ai_batches.flatMap((row) => {
      if (row.type !== 'image' && row.type !== 'text' && row.type !== 'object') return [];
      return [{ ...row, type: row.type }];
    }),
    'ai_batches'
  );
  await insertIfAny(
    tx,
    ai_batch_responses,
    data.ai_batch_responses.map((row) => {
      if (row.metadata == null) {
        throw new Error(`AI batch response ${row.batch_id}/${row.custom_id} is missing metadata`);
      }
      return { ...row, metadata: row.metadata };
    }),
    'ai_batch_responses'
  );
  await insertIfAny(tx, puzzles, data.puzzles, 'puzzles');
  await insertIfAny(tx, padavali_puzzles, data.padavali_puzzles, 'padavali_puzzles');
  await insertIfAny(tx, crossword_puzzles, data.crossword_puzzles, 'crossword_puzzles');
  await insertIfAny(tx, dvayi_puzzles, data.dvayi_puzzles, 'dvayi_puzzles');
  await insertIfAny(tx, bhramita_puzzles, data.bhramita_puzzles, 'bhramita_puzzles');
  await insertIfAny(tx, surupa_puzzles, data.surupa_puzzles, 'surupa_puzzles');
  await insertIfAny(tx, anveshi_puzzles, data.anveshi_puzzles, 'anveshi_puzzles');
  await insertIfAny(tx, puzzle_tags, data.puzzle_tags, 'puzzle_tags');
  await insertIfAny(tx, collection_items, data.collection_items, 'collection_items');
  await insertIfAny(tx, puzzle_redirects, data.puzzle_redirects, 'puzzle_redirects');
  await insertIfAny(tx, puzzle_attachments, data.puzzle_attachments, 'puzzle_attachments');
  await insertIfAny(tx, puzzle_schedules, data.puzzle_schedules, 'puzzle_schedules');
  await insertIfAny(tx, puzzle_sessions, data.puzzle_sessions, 'puzzle_sessions');
  await insertIfAny(
    tx,
    attempt_gameplay_stats,
    data.attempt_gameplay_stats,
    'attempt_gameplay_stats'
  );
  await insertIfAny(
    tx,
    crossword_gameplay_stats,
    data.crossword_gameplay_stats,
    'crossword_gameplay_stats'
  );
}

async function resetSerialSequences(tx: ExportTx): Promise<void> {
  for (const table of SERIAL_TABLES) {
    await tx.execute(
      sql.raw(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), (SELECT COUNT(*) FROM "${table}") > 0)`
      )
    );
  }
  console.log(chalk.green('✓ Reset serial sequences'));
}

const main = async () => {
  if (!(await confirm_environment())) return;

  console.log(`Inserting data into ${dbMode} database...`);
  const data = ExportDataSchema.parse(
    JSON.parse((await readFile(`./out/${dbDataFileName}`)).toString())
  );

  await dbClient_ext.transaction(async (tx) => {
    await deleteAllTables(tx);
    await insertAll(tx, data);
    await resetSerialSequences(tx);
  });
};

main()
  .catch((error) => {
    console.error(chalk.red('✗ Export failed:'), error);
    process.exitCode = 1;
  })
  .finally(() => {
    void queryClient.end();
  });

async function confirm_environment() {
  const confirmation = await take_input(`Are you sure INSERT in ${dbMode} ? `);
  return ['yes', 'y'].includes(confirmation);
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

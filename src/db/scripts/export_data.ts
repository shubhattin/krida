import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import { sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { dbClient_ext, dbDataFilePath, queryClient } from './client';
import { dbMode, take_input } from '~/tools/kry.server';
import {
  ai_batch_responses,
  ai_batches,
  anveshi_puzzles,
  attempt_gameplay_stats,
  bhramita_puzzles,
  collection_items,
  collections,
  padajala_gameplay_stats,
  padajala_puzzles,
  dvayi_puzzles,
  image_assets,
  image_system_prompt_templates,
  agent_chats,
  agent_messages,
  agent_chat_puzzles,
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
  ImageSystemPromptTemplatesSchemaZod,
  AgentChatsSchemaZod,
  AgentMessagesSchemaZod,
  AgentChatPuzzlesSchemaZod,
  PadajalaGamePlayStatsSchemaZod,
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
  // Optional so backups written before these tables existed still restore.
  image_system_prompt_templates: z.array(ImageSystemPromptTemplatesSchemaZod).optional().default([]),
  ai_batches: z.array(AiBatchSchemaZod),
  ai_batch_responses: z.array(AiBatchResponseSchemaZod),
  puzzles: z.array(PuzzleSchemaZod),
  padavali_puzzles: z.array(PadavaliPuzzleSchemaZod),
  padajala_puzzles: z.array(CrossordPuzzleSchemaZod),
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
  padajala_gameplay_stats: z.array(PadajalaGamePlayStatsSchemaZod),
  agent_chats: z.array(AgentChatsSchemaZod).optional().default([]),
  agent_messages: z.array(AgentMessagesSchemaZod).optional().default([]),
  agent_chat_puzzles: z.array(AgentChatPuzzlesSchemaZod).optional().default([])
});

type ExportData = z.infer<typeof ExportDataSchema>;

const SERIAL_TABLES = [
  'image_assets',
  'image_system_prompt_templates',
  'tags',
  'collections',
  'puzzles',
  'puzzle_redirects',
  'puzzle_attachments',
  'puzzle_schedules',
  'puzzle_sessions',
  'attempt_gameplay_stats',
  'padajala_gameplay_stats'
] as const;

async function deleteAllTables(tx: ExportTx): Promise<void> {
  await tx.delete(agent_messages);
  await tx.delete(agent_chat_puzzles);
  await tx.delete(attempt_gameplay_stats);
  await tx.delete(padajala_gameplay_stats);
  await tx.delete(puzzle_sessions);
  await tx.delete(puzzle_schedules);
  await tx.delete(puzzle_attachments);
  await tx.delete(puzzle_redirects);
  await tx.delete(puzzle_tags);
  await tx.delete(collection_items);
  await tx.delete(padavali_puzzles);
  await tx.delete(padajala_puzzles);
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
  await tx.delete(image_system_prompt_templates);
  await tx.delete(agent_chats);
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
    name === 'padajala_gameplay_stats';
  if (chunked) await insertChunked(tx, table, rows);
  else await tx.insert(table).values(rows);
  console.log(chalk.green('✓ Inserted'), chalk.blue(`\`${name}\``), rows.length);
}

async function insertAll(tx: ExportTx, data: ExportData): Promise<void> {
  await insertIfAny(tx, image_assets, data.image_assets, 'image_assets');
  await insertIfAny(
    tx,
    image_system_prompt_templates,
    data.image_system_prompt_templates,
    'image_system_prompt_templates'
  );
  await insertIfAny(tx, tags, data.tags, 'tags');
  await insertIfAny(tx, collections, data.collections, 'collections');
  await insertIfAny(tx, agent_chats, data.agent_chats, 'agent_chats');
  await insertIfAny(
    tx,
    ai_batches,
    data.ai_batches.flatMap((row) => {
      if (row.type !== 'image' && row.type !== 'text' && row.type !== 'object') {
        throw new Error(`AI batch ${row.batch_id} has unsupported type ${row.type}`);
      }
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
  await insertIfAny(tx, padajala_puzzles, data.padajala_puzzles, 'padajala_puzzles');
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
    padajala_gameplay_stats,
    data.padajala_gameplay_stats,
    'padajala_gameplay_stats'
  );
  await insertIfAny(tx, agent_messages, data.agent_messages, 'agent_messages');
  await insertIfAny(tx, agent_chat_puzzles, data.agent_chat_puzzles, 'agent_chat_puzzles');
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
  const data = ExportDataSchema.parse(JSON.parse((await readFile(dbDataFilePath)).toString()));

  await dbClient_ext.transaction(async (tx) => {
    await deleteAllTables(tx);
    await insertAll(tx, data);
    await resetSerialSequences(tx);
  });

  // The restore rewrites `puzzles`/`puzzle_redirects` out-of-band; drop the
  // cached slug map so public routes rebuild it instead of serving stale 301s.
  await flushRedirectMapKeys(['puzzle:slug_map']);
};

/**
 * Best-effort Upstash REST `DEL` for cache keys the restore invalidates.
 * Never throws — on failure the operator must flush the keys manually.
 */
async function flushRedirectMapKeys(keys: string[]): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.log(
      chalk.yellow('! UPSTASH_REDIS_REST_URL/TOKEN not set — flush Redis keys manually:'),
      chalk.yellow(keys.join(', '))
    );
    return;
  }
  try {
    const res = await fetch(`${url}/del/${keys.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(chalk.green('✓ Flushed Redis keys:'), chalk.blue(keys.join(', ')));
  } catch (error) {
    console.log(
      chalk.red('✗ Redis flush failed — flush manually:'),
      chalk.yellow(keys.join(', ')),
      error
    );
  }
}

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

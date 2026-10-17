import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import { sql } from 'drizzle-orm';
import { dbClient_ext, dbDataFileName, queryClient } from './client';
import { LegacyDumpSchema, type LegacyDump } from './legacy_dump_schema';
import { dbMode, take_input } from '~/tools/kry.server';
import type { GameKind } from '~/util/catalog/tags';
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

/**
 * Loads a pre-unification JSON dump (`backup_json.ts` / old `import_data.ts`)
 * into the shared puzzle tables.
 *
 * `--prod` / `--preview` select both the database and `./out/db_data_*.json`,
 * same as the other scripts. The database must already be migrated to the new
 * schema. Puzzle and session ids are remapped; image, tag, collection, and
 * batch ids are kept.
 */

type PatchTx = Parameters<Parameters<typeof dbClient_ext.transaction>[0]>[0];
type IdMap = Map<string, number>;

const GAMES = ['padavali', 'crossword', 'dvayi', 'bhramita', 'surupa', 'anveshi'] as const;
const ATTEMPT_GAMES = ['padavali', 'dvayi', 'bhramita', 'surupa', 'anveshi'] as const;

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

const main = async () => {
  if (!(await confirm_environment())) return;

  console.log(`Patching ${dbMode} from ./out/${dbDataFileName}...`);
  const data = LegacyDumpSchema.parse(
    JSON.parse((await readFile(`./out/${dbDataFileName}`)).toString())
  );

  await dbClient_ext.transaction(async (tx) => {
    await tx.execute(sql`select 1 from "puzzles" limit 0`);
    await deleteAllTables(tx);
    await insertKeptIds(tx, data);
    const puzzleIds = await insertPuzzles(tx, data);
    await insertPayloads(tx, data, puzzleIds);
    await insertCatalog(tx, data, puzzleIds);
    await insertSatellites(tx, data, puzzleIds);
    await insertPlayHistory(tx, data, puzzleIds);
    await resetSerialSequences(tx);
  });
  console.log(chalk.green('✓ Patch complete'));
};

main()
  .catch((error: unknown) => {
    console.error(chalk.red('✗ Patch failed:'), error);
    process.exitCode = 1;
  })
  .finally(() => {
    void queryClient.end();
  });

async function confirm_environment() {
  const confirmation = await take_input(
    `Are you sure PATCH ${dbMode} from ./out/${dbDataFileName} ? `
  );
  return ['yes', 'y'].includes(confirmation);
}

async function deleteAllTables(tx: PatchTx): Promise<void> {
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
}

async function insertKeptIds(tx: PatchTx, data: LegacyDump): Promise<void> {
  if (data.image_assets.length > 0) await tx.insert(image_assets).values(data.image_assets);
  if (data.tags.length > 0) await tx.insert(tags).values(data.tags);
  if (data.collections.length > 0) await tx.insert(collections).values(data.collections);
  if (data.ai_batches.length > 0) await tx.insert(ai_batches).values(data.ai_batches);
  if (data.ai_batch_responses.length > 0) {
    await tx.insert(ai_batch_responses).values(
      data.ai_batch_responses.map((row) => {
        if (row.metadata == null) {
          throw new Error(`AI batch response ${row.batch_id}/${row.custom_id} is missing metadata`);
        }
        return { ...row, metadata: row.metadata };
      })
    );
  }
}

async function insertPuzzles(tx: PatchTx, data: LegacyDump): Promise<IdMap> {
  const puzzleIds: IdMap = new Map();
  for (const kind of GAMES) {
    const rows = listingRows(data, kind);
    if (rows.length === 0) continue;
    const inserted = await tx
      .insert(puzzles)
      .values(
        rows.map((row) => ({
          kind,
          uid: row.uid,
          slug: row.slug,
          title: row.title,
          description: row.description,
          listed: row.listed,
          last_listed_at: row.last_listed_at,
          image_id: row.image_id,
          created_at: row.created_at,
          updated_at: row.updated_at
        }))
      )
      .returning({ id: puzzles.id, uid: puzzles.uid });
    const idByUid = new Map(inserted.map((row) => [row.uid, row.id]));
    for (const row of rows) {
      const id = idByUid.get(row.uid);
      if (id == null) throw new Error(`No new id for ${kind} puzzle uid ${row.uid}`);
      puzzleIds.set(key(kind, row.id), id);
    }
    console.log(chalk.green('✓ Puzzles'), chalk.blue(kind), rows.length);
  }
  return puzzleIds;
}

async function insertPayloads(tx: PatchTx, data: LegacyDump, puzzleIds: IdMap): Promise<void> {
  if (data.padavali_puzzles.length > 0) {
    await tx.insert(padavali_puzzles).values(
      data.padavali_puzzles.map((row) => ({
        id: must(puzzleIds, 'padavali', row.id),
        word_list: row.word_list,
        grid_data: row.grid_data,
        grid_dimensions: row.grid_dimensions
      }))
    );
  }
  if (data.crossword_puzzles.length > 0) {
    await tx.insert(crossword_puzzles).values(
      data.crossword_puzzles.map((row) => ({
        id: must(puzzleIds, 'crossword', row.id),
        grid_dimensions: row.grid_dimensions,
        grid_data: row.grid_data,
        word_list: row.word_list
      }))
    );
  }
  if (data.dvayi_puzzles.length > 0) {
    await tx.insert(dvayi_puzzles).values(
      data.dvayi_puzzles.map((row) => ({
        id: must(puzzleIds, 'dvayi', row.id),
        puzzle_data: row.puzzle_data
      }))
    );
  }
  if (data.bhramita_puzzles.length > 0) {
    await tx.insert(bhramita_puzzles).values(
      data.bhramita_puzzles.map((row) => ({
        id: must(puzzleIds, 'bhramita', row.id),
        puzzle_data: row.puzzle_data
      }))
    );
  }
  if (data.surupa_puzzles.length > 0) {
    await tx.insert(surupa_puzzles).values(
      data.surupa_puzzles.map((row) => ({
        id: must(puzzleIds, 'surupa', row.id),
        puzzle_data: row.puzzle_data
      }))
    );
  }
  if (data.anveshi_puzzles.length > 0) {
    await tx.insert(anveshi_puzzles).values(
      data.anveshi_puzzles.map((row) => ({
        id: must(puzzleIds, 'anveshi', row.id),
        puzzle_data: row.puzzle_data
      }))
    );
  }
}

async function insertCatalog(tx: PatchTx, data: LegacyDump, puzzleIds: IdMap): Promise<void> {
  const tagRows = GAMES.flatMap((kind) =>
    tagLinks(data, kind).map((row) => ({
      puzzle_id: must(puzzleIds, kind, row.puzzle_id),
      tag_id: row.tag_id
    }))
  );
  const itemRows = GAMES.flatMap((kind) =>
    collectionLinks(data, kind).map((row) => ({
      collection_id: row.collection_id,
      puzzle_id: must(puzzleIds, kind, row.puzzle_id),
      order_index: row.order_index,
      created_at: row.created_at
    }))
  );
  if (tagRows.length > 0) await tx.insert(puzzle_tags).values(tagRows);
  if (itemRows.length > 0) await tx.insert(collection_items).values(itemRows);
  console.log(chalk.green('✓ Catalog links'), tagRows.length, itemRows.length);
}

async function insertSatellites(tx: PatchTx, data: LegacyDump, puzzleIds: IdMap): Promise<void> {
  const redirectRows = GAMES.flatMap((kind) =>
    redirectsOf(data, kind).map((row) => ({
      puzzle_id: must(puzzleIds, kind, row.puzzle_id),
      kind,
      slug: row.slug,
      created_at: row.created_at
    }))
  );
  const attachmentRows = GAMES.flatMap((kind) =>
    attachmentsOf(data, kind).map((row) => ({
      puzzle_id: must(puzzleIds, kind, row.puzzle_id),
      type: row.type,
      url: row.url,
      title: row.title,
      order_index: row.order_index,
      created_at: row.created_at,
      updated_at: row.updated_at
    }))
  );
  const scheduleRows = (['padavali', 'crossword'] as const).flatMap((kind) =>
    schedulesOf(data, kind).map((row) => ({
      puzzle_id: must(puzzleIds, kind, row.puzzle_id),
      start_time: row.start_time,
      end_time: row.end_time,
      created_at: row.created_at,
      updated_at: row.updated_at,
      listing_verify_key: row.listing_verify_key
    }))
  );
  if (redirectRows.length > 0) await tx.insert(puzzle_redirects).values(redirectRows);
  if (attachmentRows.length > 0) await tx.insert(puzzle_attachments).values(attachmentRows);
  if (scheduleRows.length > 0) await tx.insert(puzzle_schedules).values(scheduleRows);
}

async function insertPlayHistory(tx: PatchTx, data: LegacyDump, puzzleIds: IdMap): Promise<void> {
  for (const kind of ATTEMPT_GAMES) {
    const sessionIds = await insertSessions(tx, kind, sessionsOf(data, kind), puzzleIds);
    const stats = attemptStatsOf(data, kind);
    for (const chunk of chunkArray(stats, 2000)) {
      if (chunk.length === 0) continue;
      await tx.insert(attempt_gameplay_stats).values(
        chunk.map((row) => ({
          puzzle_id: must(puzzleIds, kind, row.puzzle_id),
          session_id: must(sessionIds, kind, row.session_id),
          created_at: row.created_at,
          time_taken: row.time_taken,
          accuracy: row.accuracy,
          correct_attempts: row.correct_attempts,
          total_attempts: row.total_attempts
        }))
      );
    }
    console.log(chalk.green('✓ Play history'), chalk.blue(kind), sessionsOf(data, kind).length);
  }

  const crosswordSessionIds = await insertSessions(
    tx,
    'crossword',
    data.crossword_sessions,
    puzzleIds
  );
  for (const chunk of chunkArray(data.crossword_gameplay_stats, 2000)) {
    if (chunk.length === 0) continue;
    await tx.insert(crossword_gameplay_stats).values(
      chunk.map((row) => ({
        puzzle_id: must(puzzleIds, 'crossword', row.puzzle_id),
        session_id: must(crosswordSessionIds, 'crossword', row.session_id),
        created_at: row.created_at,
        time_taken: row.time_taken,
        accuracy: row.accuracy,
        total_entries: row.total_entries,
        total_cells: row.total_cells,
        prefilled_cells: row.prefilled_cells,
        letter_inputs: row.letter_inputs,
        incorrect_entry_attempts: row.incorrect_entry_attempts
      }))
    );
  }
}

type SessionSource = {
  id: number;
  puzzle_id: number;
  created_at: Date;
  location: LegacyDump['padavali_sessions'][number]['location'];
  user_id: string | null;
  practice_mode?: boolean;
  script?: LegacyDump['padavali_sessions'][number]['script'];
};

async function insertSessions(
  tx: PatchTx,
  kind: GameKind,
  rows: readonly SessionSource[],
  puzzleIds: IdMap
): Promise<IdMap> {
  const sessionIds: IdMap = new Map();
  for (const chunk of chunkArray([...rows], 2000)) {
    if (chunk.length === 0) continue;
    const inserted = await tx
      .insert(puzzle_sessions)
      .values(
        chunk.map((row) => ({
          puzzle_id: must(puzzleIds, kind, row.puzzle_id),
          created_at: row.created_at,
          practice_mode: row.practice_mode ?? false,
          location: row.location,
          script: row.script ?? null,
          user_id: row.user_id
        }))
      )
      .returning({ id: puzzle_sessions.id });
    if (inserted.length !== chunk.length) {
      throw new Error(`Session insert for ${kind} returned ${inserted.length} ids`);
    }
    chunk.forEach((row, index) => {
      sessionIds.set(key(kind, row.id), inserted[index]!.id);
    });
  }
  return sessionIds;
}

async function resetSerialSequences(tx: PatchTx): Promise<void> {
  for (const table of SERIAL_TABLES) {
    await tx.execute(
      sql.raw(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), (SELECT COUNT(*) FROM "${table}") > 0)`
      )
    );
  }
}

function listingRows(data: LegacyDump, kind: GameKind) {
  switch (kind) {
    case 'padavali':
      return data.padavali_puzzles;
    case 'crossword':
      return data.crossword_puzzles;
    case 'dvayi':
      return data.dvayi_puzzles;
    case 'bhramita':
      return data.bhramita_puzzles;
    case 'surupa':
      return data.surupa_puzzles;
    case 'anveshi':
      return data.anveshi_puzzles;
  }
}

function tagLinks(data: LegacyDump, kind: GameKind) {
  switch (kind) {
    case 'padavali':
      return data.padavali_puzzle_tags;
    case 'crossword':
      return data.crossword_puzzle_tags;
    case 'dvayi':
      return data.dvayi_puzzle_tags;
    case 'bhramita':
      return data.bhramita_puzzle_tags;
    case 'surupa':
      return data.surupa_puzzle_tags;
    case 'anveshi':
      return data.anveshi_puzzle_tags;
  }
}

function collectionLinks(data: LegacyDump, kind: GameKind) {
  switch (kind) {
    case 'padavali':
      return data.padavali_collection_items;
    case 'crossword':
      return data.crossword_collection_items;
    case 'dvayi':
      return data.dvayi_collection_items;
    case 'bhramita':
      return data.bhramita_collection_items;
    case 'surupa':
      return data.surupa_collection_items;
    case 'anveshi':
      return data.anveshi_collection_items;
  }
}

function redirectsOf(data: LegacyDump, kind: GameKind) {
  switch (kind) {
    case 'padavali':
      return data.padavali_redirects;
    case 'crossword':
      return data.crossword_redirects;
    case 'dvayi':
      return data.dvayi_redirects;
    case 'bhramita':
      return data.bhramita_redirects;
    case 'surupa':
      return data.surupa_redirects;
    case 'anveshi':
      return data.anveshi_redirects;
  }
}

function attachmentsOf(data: LegacyDump, kind: GameKind) {
  switch (kind) {
    case 'padavali':
      return data.padavali_attachments;
    case 'crossword':
      return data.crossword_attachments;
    case 'dvayi':
      return data.dvayi_attachments;
    case 'bhramita':
      return data.bhramita_attachments;
    case 'surupa':
      return data.surupa_attachments;
    case 'anveshi':
      return data.anveshi_attachments;
  }
}

function schedulesOf(data: LegacyDump, kind: 'padavali' | 'crossword') {
  return kind === 'padavali' ? data.padavali_schedules : data.crossword_schedules;
}

function sessionsOf(data: LegacyDump, kind: (typeof ATTEMPT_GAMES)[number]) {
  switch (kind) {
    case 'padavali':
      return data.padavali_sessions;
    case 'dvayi':
      return data.dvayi_sessions;
    case 'bhramita':
      return data.bhramita_sessions;
    case 'surupa':
      return data.surupa_sessions;
    case 'anveshi':
      return data.anveshi_sessions;
  }
}

function attemptStatsOf(data: LegacyDump, kind: (typeof ATTEMPT_GAMES)[number]) {
  switch (kind) {
    case 'padavali':
      return data.padavali_gameplay_stats;
    case 'dvayi':
      return data.dvayi_gameplay_stats;
    case 'bhramita':
      return data.bhramita_gameplay_stats;
    case 'surupa':
      return data.surupa_gameplay_stats;
    case 'anveshi':
      return data.anveshi_gameplay_stats;
  }
}

function must(map: IdMap, kind: string, oldId: number): number {
  const id = map.get(key(kind, oldId));
  if (id == null) throw new Error(`Missing remapped id for ${kind} ${oldId}`);
  return id;
}

function key(kind: string, oldId: number): string {
  return `${kind}:${oldId}`;
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

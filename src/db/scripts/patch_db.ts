import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import { sql } from 'drizzle-orm';
import { dbClient_ext, dbDataFilePath, queryClient } from './client';
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
  padajala_gameplay_stats,
  padajala_puzzles,
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
 * `--prod` / `--preview` select both the database and the dump file (resolved
 * under repo-root `out/` regardless of cwd). The database must already be
 * migrated to the new schema.
 *
 * The dump keeps the legacy per-game layout, so the `padajala` game still
 * reads `crossword_*` dump keys and legacy batch metadata (`type:
 * 'crossword-puzzle-image'`, normalized by `legacy_dump_schema.ts`).
 *
 * Merged tables get fresh ids reassigned from 1 in deterministic dump order,
 * with legacy→new maps tracked for cross-references (`puzzles`,
 * `puzzle_sessions`). Leaf satellites (`puzzle_redirects`,
 * `puzzle_attachments`, `puzzle_schedules`, `attempt_gameplay_stats`,
 * `padajala_gameplay_stats`) also get explicit ids from 1 per table.
 * Image, tag, collection, and batch ids are kept.
 */

type PatchTx = Parameters<Parameters<typeof dbClient_ext.transaction>[0]>[0];
type IdMap = Map<string, number>;

const GAMES = ['padavali', 'padajala', 'dvayi', 'bhramita', 'surupa', 'anveshi'] as const;
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
  'padajala_gameplay_stats'
] as const;

const main = async () => {
  console.log(`Patching ${dbMode} from ${dbDataFilePath}...`);
  const data = LegacyDumpSchema.parse(JSON.parse((await readFile(dbDataFilePath)).toString()));
  // Fail before touching the database: every check here aborts prior to the
  // destructive wipe inside the transaction below.
  validateDump(data);
  if (!(await confirm_environment(dumpSummary(data)))) return;

  await dbClient_ext.transaction(async (tx) => {
    await tx.execute(sql`select 1 from "puzzles" limit 0`);
    await deleteAllTables(tx);
    await insertKeptIds(tx, data);
    const puzzleIds = await insertPuzzles(tx, data);
    await insertBatchResponses(tx, data, puzzleIds);
    await insertPayloads(tx, data, puzzleIds);
    await insertCatalog(tx, data, puzzleIds);
    await insertSatellites(tx, data, puzzleIds);
    await insertPlayHistory(tx, data, puzzleIds);
    await resetSerialSequences(tx);
  });
  console.log(chalk.green('✓ Patch complete'));
};

main()
  .catch((error) => {
    console.error(chalk.red('✗ Patch failed:'), error);
    process.exitCode = 1;
  })
  .finally(() => {
    void queryClient.end();
  });

async function confirm_environment(summary: string) {
  if (!process.stdin.isTTY) {
    throw new Error('Refusing to patch without an interactive terminal (stdin is not a TTY)');
  }
  console.log(summary);
  const confirmation = await take_input(
    `Are you sure PATCH ${dbMode} from ${dbDataFilePath} ? Type "yes" to proceed: `
  );
  return confirmation.trim().toLowerCase() === 'yes';
}

/** Pre-transaction semantic checks. Throws before any row is deleted. */
function validateDump(data: LegacyDump): void {
  const totalPuzzles = GAMES.reduce((sum, kind) => sum + listingRows(data, kind).length, 0);
  if (totalPuzzles === 0) {
    throw new Error('Refusing to wipe the target database for a dump containing zero puzzles');
  }
  const missingMetadata = data.ai_batch_responses
    .filter((row) => row.metadata == null)
    .map((row) => `${row.batch_id}/${row.custom_id}`);
  if (missingMetadata.length > 0) {
    throw new Error(
      `AI batch responses missing metadata (would abort the reload): ${missingMetadata.join(', ')}`
    );
  }
  // puzzles.uid is globally unique post-unification; per-game dumps may collide.
  const seenUids = new Map<string, string>();
  for (const kind of GAMES) {
    for (const row of listingRows(data, kind)) {
      const owner = seenUids.get(row.uid);
      if (owner !== undefined) {
        throw new Error(`Duplicate puzzle uid "${row.uid}" in ${owner} and ${kind} dumps`);
      }
      seenUids.set(row.uid, kind);
    }
  }
}

function dumpSummary(data: LegacyDump): string {
  const parts = GAMES.map((kind) => `${kind}=${listingRows(data, kind).length}`);
  const sessions =
    ATTEMPT_GAMES.reduce((sum, kind) => sum + sessionsOf(data, kind).length, 0) +
    data.crossword_sessions.length;
  return `Dump counts: puzzles { ${parts.join(', ')} }, sessions=${sessions}, batches=${data.ai_batches.length}`;
}

async function deleteAllTables(tx: PatchTx): Promise<void> {
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
}

async function insertKeptIds(tx: PatchTx, data: LegacyDump): Promise<void> {
  if (data.image_assets.length > 0) await tx.insert(image_assets).values(data.image_assets);
  if (data.tags.length > 0) await tx.insert(tags).values(data.tags);
  if (data.collections.length > 0) await tx.insert(collections).values(data.collections);
  if (data.ai_batches.length > 0) await tx.insert(ai_batches).values(data.ai_batches);
}

async function insertBatchResponses(
  tx: PatchTx,
  data: LegacyDump,
  puzzleIds: IdMap
): Promise<void> {
  if (data.ai_batch_responses.length === 0) return;
  await tx.insert(ai_batch_responses).values(
    data.ai_batch_responses.map((row) => {
      if (row.metadata == null) {
        throw new Error(`AI batch response ${row.batch_id}/${row.custom_id} is missing metadata`);
      }
      const puzzle_id = puzzleIds.get(key(row.metadata.game, row.metadata.puzzle_id));
      if (puzzle_id == null) {
        throw new Error(
          `AI batch response ${row.batch_id}/${row.custom_id} has no remapped ${row.metadata.game} puzzle ${row.metadata.puzzle_id}`
        );
      }
      return {
        ...row,
        custom_id: row.custom_id,
        metadata: { ...row.metadata, puzzle_id }
      };
    })
  );
}

async function insertPuzzles(tx: PatchTx, data: LegacyDump): Promise<IdMap> {
  const puzzleIds: IdMap = new Map();
  let nextId = 1;
  for (const kind of GAMES) {
    const rows = listingRows(data, kind);
    if (rows.length === 0) continue;
    const rowsWithIds = rows.map((row) => {
      const id = nextId;
      nextId += 1;
      puzzleIds.set(key(kind, row.id), id);
      return {
        id,
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
      };
    });
    for (const chunk of chunkArray(rowsWithIds, 2000)) {
      if (chunk.length === 0) continue;
      await tx.insert(puzzles).values(chunk);
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
    await tx.insert(padajala_puzzles).values(
      data.crossword_puzzles.map((row) => ({
        id: must(puzzleIds, 'padajala', row.id),
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
  const mergedItems = GAMES.flatMap((kind, gameOrder) =>
    collectionLinks(data, kind).map((row) => ({
      collection_id: row.collection_id,
      legacy_puzzle_id: row.puzzle_id,
      kind,
      gameOrder,
      order_index: row.order_index,
      created_at: row.created_at
    }))
  ).toSorted(
    (a, b) =>
      a.collection_id - b.collection_id ||
      a.order_index - b.order_index ||
      a.legacy_puzzle_id - b.legacy_puzzle_id ||
      a.gameOrder - b.gameOrder
  );
  let lastCollection = -1;
  let nextIndex = 0;
  const itemRows = mergedItems.map((row) => {
    if (row.collection_id !== lastCollection) {
      lastCollection = row.collection_id;
      nextIndex = 0;
    }
    const order_index = nextIndex;
    nextIndex += 1;
    return {
      collection_id: row.collection_id,
      puzzle_id: must(puzzleIds, row.kind, row.legacy_puzzle_id),
      order_index,
      created_at: row.created_at
    };
  });
  if (tagRows.length > 0) {
    for (const chunk of chunkArray(tagRows, 2000)) {
      await tx.insert(puzzle_tags).values(chunk);
    }
  }
  if (itemRows.length > 0) {
    for (const chunk of chunkArray(itemRows, 2000)) {
      await tx.insert(collection_items).values(chunk);
    }
  }
  console.log(chalk.green('✓ Catalog links'), tagRows.length, itemRows.length);
}

async function insertSatellites(tx: PatchTx, data: LegacyDump, puzzleIds: IdMap): Promise<void> {
  let nextRedirectId = 1;
  const redirectRows = GAMES.flatMap((kind) =>
    redirectsOf(data, kind).map((row) => ({
      id: nextRedirectId++,
      puzzle_id: must(puzzleIds, kind, row.puzzle_id),
      kind,
      slug: row.slug,
      created_at: row.created_at
    }))
  );
  let nextAttachmentId = 1;
  const attachmentRows = GAMES.flatMap((kind) =>
    attachmentsOf(data, kind).map((row) => ({
      id: nextAttachmentId++,
      puzzle_id: must(puzzleIds, kind, row.puzzle_id),
      type: row.type,
      url: row.url,
      title: row.title,
      order_index: row.order_index,
      created_at: row.created_at,
      updated_at: row.updated_at
    }))
  );
  let nextScheduleId = 1;
  const scheduleRows = (['padavali', 'padajala'] as const).flatMap((kind) =>
    schedulesOf(data, kind).map((row) => ({
      id: nextScheduleId++,
      puzzle_id: must(puzzleIds, kind, row.puzzle_id),
      start_time: row.start_time,
      end_time: row.end_time,
      created_at: row.created_at,
      updated_at: row.updated_at,
      listing_verify_key: row.listing_verify_key
    }))
  );
  if (redirectRows.length > 0) {
    for (const chunk of chunkArray(redirectRows, 2000)) {
      await tx.insert(puzzle_redirects).values(chunk);
    }
  }
  if (attachmentRows.length > 0) {
    for (const chunk of chunkArray(attachmentRows, 2000)) {
      await tx.insert(puzzle_attachments).values(chunk);
    }
  }
  if (scheduleRows.length > 0) {
    for (const chunk of chunkArray(scheduleRows, 2000)) {
      await tx.insert(puzzle_schedules).values(chunk);
    }
  }
}

async function insertPlayHistory(tx: PatchTx, data: LegacyDump, puzzleIds: IdMap): Promise<void> {
  const sessionCounter = { next: 1 };
  let nextAttemptStatId = 1;
  for (const kind of ATTEMPT_GAMES) {
    const sessionIds = await insertSessions(
      tx,
      kind,
      sessionsOf(data, kind),
      puzzleIds,
      sessionCounter
    );
    const stats = attemptStatsOf(data, kind);
    for (const chunk of chunkArray(stats, 2000)) {
      if (chunk.length === 0) continue;
      await tx.insert(attempt_gameplay_stats).values(
        chunk.map((row) => ({
          id: nextAttemptStatId++,
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

  const padajalaSessionIds = await insertSessions(
    tx,
    'padajala',
    data.crossword_sessions,
    puzzleIds,
    sessionCounter
  );
  let nextPadajalaStatId = 1;
  for (const chunk of chunkArray(data.crossword_gameplay_stats, 2000)) {
    if (chunk.length === 0) continue;
    await tx.insert(padajala_gameplay_stats).values(
      chunk.map((row) => ({
        id: nextPadajalaStatId++,
        puzzle_id: must(puzzleIds, 'padajala', row.puzzle_id),
        session_id: must(padajalaSessionIds, 'padajala', row.session_id),
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
  puzzleIds: IdMap,
  sessionCounter: { next: number }
): Promise<IdMap> {
  const sessionIds: IdMap = new Map();
  const rowsWithIds = [...rows].map((row) => {
    const id = sessionCounter.next;
    sessionCounter.next += 1;
    sessionIds.set(key(kind, row.id), id);
    return {
      id,
      puzzle_id: must(puzzleIds, kind, row.puzzle_id),
      created_at: row.created_at,
      practice_mode: row.practice_mode ?? false,
      location: row.location,
      script: row.script ?? null,
      user_id: row.user_id
    };
  });
  for (const chunk of chunkArray(rowsWithIds, 2000)) {
    if (chunk.length === 0) continue;
    await tx.insert(puzzle_sessions).values(chunk);
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
    case 'padajala':
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
    case 'padajala':
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
    case 'padajala':
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
    case 'padajala':
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
    case 'padajala':
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

function schedulesOf(data: LegacyDump, kind: 'padavali' | 'padajala') {
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

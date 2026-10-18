import path from 'node:path';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { writeFile } from 'node:fs/promises';
import { dbMode, make_dir, take_input } from '~/tools/kry.server';

/**
 * Dumps the pre-unification tables with raw SQL.
 *
 * The column list is hardcoded on purpose. This script must keep working after
 * `src/db/schema` moves to the shared `puzzles` tables, so a `--prod` or local
 * database that still has the old layout can be saved to the same JSON shape
 * that `import_data.ts` used to write (`out/db_data_prod.json` with `--prod`).
 */

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env') });

const dbUrl = {
  LOCAL: process.env.PG_DATABASE_URL,
  PROD: process.env.PG_DATABASE_URL1,
  PREVIEW: process.env.PG_DATABASE_URL2
}[dbMode];

const dbDataFileName = {
  PROD: 'db_data_prod.json',
  PREVIEW: 'db_data_preview.json',
  LOCAL: 'db_data.json'
}[dbMode];

if (!dbUrl) {
  throw new Error(
    `Database URL is not configured for ${dbMode} scripts (PG_DATABASE_URL / PG_DATABASE_URL1 / PG_DATABASE_URL2)`
  );
}

const sql = postgres(dbUrl);

const attachmentColumns = [
  'id',
  'puzzle_id',
  'type',
  'url',
  'title',
  'order_index',
  'created_at',
  'updated_at'
] as const;

const scheduleColumns = [
  'id',
  'puzzle_id',
  'start_time',
  'end_time',
  'created_at',
  'updated_at',
  'listing_verify_key'
] as const;

const redirectColumns = ['id', 'puzzle_id', 'slug', 'created_at'] as const;

const attemptStatsColumns = [
  'id',
  'puzzle_id',
  'session_id',
  'created_at',
  'time_taken',
  'accuracy',
  'correct_attempts',
  'total_attempts'
] as const;

const tagLinkColumns = ['puzzle_id', 'tag_id'] as const;

const collectionItemColumns = ['collection_id', 'puzzle_id', 'order_index', 'created_at'] as const;

const simplePuzzleColumns = [
  'id',
  'uid',
  'slug',
  'title',
  'description',
  'created_at',
  'updated_at',
  'puzzle_data',
  'listed',
  'last_listed_at',
  'image_id'
] as const;

const simpleSessionColumns = [
  'id',
  'puzzle_id',
  'created_at',
  'location',
  'script',
  'user_id'
] as const;

type DumpTable = {
  key: string;
  columns: readonly string[];
  orderBy: string;
};

const SIMPLE_GAMES = ['dvayi', 'bhramita', 'surupa', 'anveshi'] as const;

function simpleGameTables(game: (typeof SIMPLE_GAMES)[number]): DumpTable[] {
  return [
    { key: `${game}_puzzles`, columns: simplePuzzleColumns, orderBy: '"id"' },
    { key: `${game}_redirects`, columns: redirectColumns, orderBy: '"id"' },
    { key: `${game}_attachments`, columns: attachmentColumns, orderBy: '"id"' },
    { key: `${game}_sessions`, columns: simpleSessionColumns, orderBy: '"id"' },
    { key: `${game}_gameplay_stats`, columns: attemptStatsColumns, orderBy: '"id"' },
    { key: `${game}_puzzle_tags`, columns: tagLinkColumns, orderBy: '"puzzle_id", "tag_id"' },
    {
      key: `${game}_collection_items`,
      columns: collectionItemColumns,
      orderBy: '"collection_id", "puzzle_id"'
    }
  ];
}

/** Same key order as the historical `import_data.ts` JSON object. */
const DUMP_TABLES: DumpTable[] = [
  {
    key: 'padavali_puzzles',
    columns: [
      'id',
      'uid',
      'slug',
      'title',
      'description',
      'created_at',
      'updated_at',
      'word_list',
      'grid_data',
      'grid_dimensions',
      'listed',
      'last_listed_at',
      'image_id'
    ],
    orderBy: '"id"'
  },
  { key: 'padavali_attachments', columns: attachmentColumns, orderBy: '"id"' },
  { key: 'padavali_schedules', columns: scheduleColumns, orderBy: '"id"' },
  {
    key: 'padavali_sessions',
    columns: ['id', 'puzzle_id', 'created_at', 'practice_mode', 'location', 'script', 'user_id'],
    orderBy: '"id"'
  },
  { key: 'padavali_gameplay_stats', columns: attemptStatsColumns, orderBy: '"id"' },
  {
    key: 'ai_batch_responses',
    columns: ['batch_id', 'custom_id', 'auto_approved', 'metadata'],
    orderBy: '"batch_id", "custom_id"'
  },
  {
    key: 'ai_batches',
    columns: ['batch_id', 'type', 'output_resolved', 'input_file_id', 'output_file_id'],
    orderBy: '"batch_id"'
  },
  { key: 'padavali_redirects', columns: redirectColumns, orderBy: '"id"' },
  {
    key: 'image_assets',
    columns: ['id', 'description', 'width', 'height', 's3_key', 'created_at'],
    orderBy: '"id"'
  },
  {
    key: 'crossword_puzzles',
    columns: [
      'id',
      'uid',
      'slug',
      'title',
      'description',
      'grid_dimensions',
      'grid_data',
      'word_list',
      'listed',
      'last_listed_at',
      'image_id',
      'created_at',
      'updated_at'
    ],
    orderBy: '"id"'
  },
  { key: 'crossword_redirects', columns: redirectColumns, orderBy: '"id"' },
  { key: 'crossword_attachments', columns: attachmentColumns, orderBy: '"id"' },
  {
    key: 'crossword_sessions',
    columns: ['id', 'puzzle_id', 'created_at', 'location', 'user_id'],
    orderBy: '"id"'
  },
  {
    key: 'crossword_gameplay_stats',
    columns: [
      'id',
      'puzzle_id',
      'session_id',
      'created_at',
      'time_taken',
      'accuracy',
      'total_entries',
      'total_cells',
      'prefilled_cells',
      'letter_inputs',
      'incorrect_entry_attempts'
    ],
    orderBy: '"id"'
  },
  { key: 'crossword_schedules', columns: scheduleColumns, orderBy: '"id"' },
  { key: 'tags', columns: ['id', 'slug', 'created_at'], orderBy: '"id"' },
  {
    key: 'collections',
    columns: [
      'id',
      'uid',
      'slug',
      'title',
      'description',
      'image_id',
      'listed',
      'created_at',
      'updated_at'
    ],
    orderBy: '"id"'
  },
  {
    key: 'padavali_puzzle_tags',
    columns: tagLinkColumns,
    orderBy: '"puzzle_id", "tag_id"'
  },
  {
    key: 'crossword_puzzle_tags',
    columns: tagLinkColumns,
    orderBy: '"puzzle_id", "tag_id"'
  },
  {
    key: 'padavali_collection_items',
    columns: collectionItemColumns,
    orderBy: '"collection_id", "puzzle_id"'
  },
  {
    key: 'crossword_collection_items',
    columns: collectionItemColumns,
    orderBy: '"collection_id", "puzzle_id"'
  },
  ...SIMPLE_GAMES.flatMap(simpleGameTables)
];

type LegacyDumpCell =
  | string
  | number
  | boolean
  | null
  | Date
  | LegacyDumpCell[]
  | { readonly [column: string]: LegacyDumpCell };

type LegacyDumpRow = { [column: string]: LegacyDumpCell };

function quoteIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Refusing to query unexpected identifier \`${name}\``);
  }
  return `"${name}"`;
}

async function selectTable(table: DumpTable): Promise<LegacyDumpRow[]> {
  const columns = table.columns.map(quoteIdent).join(', ');
  const result = await sql.unsafe(
    `select ${columns} from ${quoteIdent(table.key)} order by ${table.orderBy}`
  );
  return result.map((row) => {
    const out: LegacyDumpRow = {};
    for (const column of table.columns) {
      if (!Object.hasOwn(row, column)) {
        throw new Error(`Column ${table.key}.${column} was not returned`);
      }
      out[column] = row[column];
    }
    return out;
  });
}

export async function backup_json(confirm_env = true) {
  if (confirm_env && !(await confirm_environment())) return;

  console.log(`Fetching legacy tables from ${dbMode} with raw SQL...`);
  const json_data: { [table: string]: LegacyDumpRow[] } = {};
  for (const table of DUMP_TABLES) {
    json_data[table.key] = await selectTable(table);
    console.log(`${table.key}: ${json_data[table.key]!.length}`);
  }

  const outPath = path.resolve(import.meta.dirname, '../../../out', dbDataFileName);
  await make_dir(path.dirname(outPath));
  await writeFile(outPath, JSON.stringify(json_data, null, 2));
  console.log(`Wrote ${outPath}`);
}

if (require.main === module) {
  backup_json()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => {
      void sql.end();
    });
}

async function confirm_environment() {
  const confirmation = await take_input(`Are you sure SELECT from ${dbMode} ? `);
  return ['yes', 'y'].includes(confirmation);
}

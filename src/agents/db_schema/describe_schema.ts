import { is } from 'drizzle-orm';
import { getTableConfig, isPgEnum, PgTable, type PgColumn } from 'drizzle-orm/pg-core';
import * as schema from '~/db/schema';
import { HIDDEN_TABLES, JSONB_COLUMN_TYPES, TABLE_NOTES } from './table_notes';

/**
 * Compact DDL for the agents, built from the live Drizzle schema on every server start, so it
 * can never drift from `src/db/schema`. Meaning that types cannot carry (what `listed` means,
 * JSONB shapes) comes from `table_notes.ts`, and a test fails when a table has no note.
 */

const schemaExports: unknown[] = Object.values(schema);

export function schemaTables(): PgTable[] {
  return schemaExports.filter((value): value is PgTable => is(value, PgTable));
}

function enumLines(): string[] {
  return schemaExports
    .filter(isPgEnum)
    .map((pgEnum) => `ENUM ${pgEnum.enumName}: ${pgEnum.enumValues.join(' | ')}`)
    .toSorted();
}

function columnLine(tableName: string, column: PgColumn, fkTargets: Map<string, string>) {
  const parts = [
    column.name,
    column.getSQLType().replace('timestamp with time zone', 'timestamptz')
  ];
  if (column.primary) parts.push('PK');
  else if (column.notNull) parts.push('NOT NULL');
  if (column.isUnique) parts.push('UNIQUE');
  if (column.hasDefault && !column.primary) parts.push('DEFAULT');
  const target = fkTargets.get(column.name);
  if (target) parts.push(`→ ${target}`);
  const jsonType = JSONB_COLUMN_TYPES.get(`${tableName}.${column.name}`);
  if (jsonType) parts.push(`-- ${jsonType}`);
  return `  ${parts.join(' ')}`;
}

function tableBlock(table: PgTable): string | null {
  const config = getTableConfig(table);
  if (HIDDEN_TABLES.has(config.name)) return null;

  const fkTargets = new Map<string, string>();
  for (const fk of config.foreignKeys) {
    const ref = fk.reference();
    const foreignName = getTableConfig(ref.foreignTable).name;
    ref.columns.forEach((column, index) => {
      const foreign = ref.foreignColumns[index];
      if (foreign && !fkTargets.has(column.name)) {
        fkTargets.set(column.name, `${foreignName}.${foreign.name}`);
      }
    });
  }

  const note = TABLE_NOTES.get(config.name);
  const lines = [`TABLE ${config.name}${note ? ` -- ${note}` : ''}`];
  for (const column of config.columns) lines.push(columnLine(config.name, column, fkTargets));
  for (const pk of config.primaryKeys) {
    lines.push(`  PRIMARY KEY (${pk.columns.map((column) => column.name).join(', ')})`);
  }
  for (const unique of config.uniqueConstraints) {
    lines.push(`  UNIQUE (${unique.columns.map((column) => column.name).join(', ')})`);
  }
  return lines.join('\n');
}

let cached: string | undefined;

/** The whole database, as the agents see it. Deterministic, so it stays prompt-cache friendly. */
export function describeDatabaseSchema(): string {
  cached ??= [
    ...enumLines(),
    '',
    ...schemaTables()
      .toSorted((a, b) => getTableConfig(a).name.localeCompare(getTableConfig(b).name))
      .map(tableBlock)
      .filter((block): block is string => block !== null)
  ].join('\n');
  return cached;
}

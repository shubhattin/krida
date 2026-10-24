import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describeDatabaseSchema, schemaTables } from './describe_schema';
import { HIDDEN_TABLES, JSONB_COLUMN_TYPES, TABLE_NOTES } from './table_notes';

const visibleTables = () =>
  schemaTables()
    .map((table) => getTableConfig(table))
    .filter((config) => !HIDDEN_TABLES.has(config.name));

describe('agent database schema', () => {
  it('has a note for every table (add one to table_notes.ts with each new table)', () => {
    const missing = visibleTables()
      .map((config) => config.name)
      .filter((name) => !TABLE_NOTES.has(name));
    expect(missing).toEqual([]);
  });

  it('describes the shape of every JSONB column', () => {
    const missing = visibleTables().flatMap((config) =>
      config.columns
        .filter((column) => column.getSQLType() === 'jsonb')
        .map((column) => `${config.name}.${column.name}`)
        .filter((key) => !JSONB_COLUMN_TYPES.has(key))
    );
    expect(missing).toEqual([]);
  });

  it('has no stale notes', () => {
    const names = new Set(schemaTables().map((table) => getTableConfig(table).name));
    expect([...TABLE_NOTES.keys()].filter((name) => !names.has(name))).toEqual([]);
  });

  it('renders foreign keys and JSONB shapes, and hides agent tables', () => {
    const ddl = describeDatabaseSchema();
    expect(ddl).toContain('TABLE puzzles');
    expect(ddl).toContain('puzzle_id integer NOT NULL → puzzles.id');
    expect(ddl).toContain('puzzle_data jsonb NOT NULL -- { words:');
    expect(ddl).not.toContain('TABLE agent_messages');
  });
});

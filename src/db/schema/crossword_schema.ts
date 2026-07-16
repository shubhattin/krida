import { pgTable, serial, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import type { CrossordPuzzleGridCell, CrossWordPuzzleWord } from '~/db/schema_zod';

export const crossord_puzzles = pgTable(
  'crossord_puzzles',
  {
    id: serial().primaryKey(),
    /** slug is optional for now, will be put into use further down */
    slug: text(),
    /** Short English title */
    title: text().notNull(),
    /** Description of the puzzle */
    description: text(),
    /** Grid size as [rows, cols] */
    grid_dimensions: jsonb().notNull().$type<[number, number]>(),
    /** Blank text = blocked box; letter cells are playable (is_visible = prefilled hint). */
    grid_data: jsonb().notNull().$type<CrossordPuzzleGridCell[][]>(),
    word_list: jsonb().notNull().$type<CrossWordPuzzleWord[]>(),
    /** Whether the puzzle is listed publicly on the website */
    listed: boolean().notNull().default(false),
    last_listed_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
  },
  (table) => [
    index('crossord_puzzles_listed_created_at_idx').on(table.listed, table.created_at),
    index('crossord_puzzles_listed_updated_at_idx').on(table.listed, table.updated_at),
    index('crossord_puzzles_listed_last_listed_at_idx').on(table.listed, table.last_listed_at)
  ]
);

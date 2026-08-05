import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
  integer,
  varchar,
  uniqueIndex,
  smallint
} from 'drizzle-orm/pg-core';
import type { CrossordPuzzleGridCell, CrossWordPuzzleWord } from '~/db/schema_zod';
import type { location_list_type } from '../types';
import { image_assets, attachment_type_enum } from './common_schema';

export const crossword_puzzles = pgTable(
  'crossword_puzzles',
  {
    id: serial().primaryKey(),
    slug: text().notNull(),
    /** Short English title */
    title: text().notNull(),
    /** Description of the puzzle */
    description: text().notNull().default(''),
    /** Grid size as [rows, cols] */
    grid_dimensions: jsonb().notNull().$type<[number, number]>(),
    /** Blank text = blocked box; letter cells are playable (is_visible = prefilled hint). */
    grid_data: jsonb().notNull().$type<CrossordPuzzleGridCell[][]>(),
    word_candidates: jsonb().$type<
      {
        word: string;
        /** Added to `word_list` */
        added: boolean;
      }[]
    >(),
    word_list: jsonb().notNull().$type<CrossWordPuzzleWord[]>(),
    /** Whether the puzzle is listed publicly on the website */
    listed: boolean().notNull().default(false),
    last_listed_at: timestamp({ withTimezone: true }),
    image_id: integer().references(() => image_assets.id, { onDelete: 'set null' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
  },
  (table) => [
    uniqueIndex('crossword_puzzles_slug_idx').on(table.slug),
    index('crossword_puzzles_listed_created_at_idx').on(table.listed, table.created_at),
    index('crossword_puzzles_listed_updated_at_idx').on(table.listed, table.updated_at),
    index('crossword_puzzles_listed_last_listed_at_idx').on(table.listed, table.last_listed_at)
  ]
);

/**
 * Used to redirect old URLs to the new ones (like after we change the slug)
 */
export const crossword_redirects = pgTable('crossword_redirects', {
  id: serial().primaryKey(),
  puzzle_id: integer()
    .notNull()
    .references(() => crossword_puzzles.id, { onDelete: 'cascade' }),
  /** The old slug from which we would redirect to the new slug */
  slug: text().notNull().unique(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
});

export const crossword_attachments = pgTable(
  'crossword_attachments',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => crossword_puzzles.id, { onDelete: 'cascade' }),
    type: attachment_type_enum().notNull(),
    url: text().notNull(),
    title: text(),
    order_index: smallint().notNull().default(1), // starts from 1
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
  },
  (table) => [index('crossword_attachments_puzzle_id_idx').on(table.puzzle_id)]
);

export const crossword_sessions = pgTable(
  'crossword_sessions',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => crossword_puzzles.id, { onDelete: 'cascade' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    location: varchar({ length: 25 }).$type<location_list_type>()
  },
  (table) => [
    index('crossword_sessions_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at)
  ]
);

export const crossword_gameplay_stats = pgTable(
  'crossword_gameplay_stats',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => crossword_puzzles.id, { onDelete: 'cascade' }),
    session_id: integer()
      .notNull()
      .references(() => crossword_sessions.id, { onDelete: 'cascade' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    time_taken: integer().notNull(),
    /** total_entries / (total_entries + incorrect_entry_attempts) * 100 */
    accuracy: integer().notNull(),
    total_entries: integer().notNull(),
    total_cells: integer().notNull(),
    prefilled_cells: integer().notNull(),
    letter_inputs: integer().notNull(),
    incorrect_entry_attempts: integer().notNull()
  },
  (table) => [
    index('crossword_gameplay_stats_puzzle_id_created_at_idx').on(
      table.puzzle_id,
      table.created_at
    ),
    uniqueIndex('crossword_gameplay_stats_session_id_idx').on(table.session_id)
  ]
);

export const crossword_schedules = pgTable(
  'crossword_schedules',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => crossword_puzzles.id, { onDelete: 'cascade' }),
    start_time: timestamp({ withTimezone: true }).notNull(),
    end_time: timestamp({ withTimezone: true }).notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
    listing_verify_key: text()
  },
  (table) => [
    index('crossword_schedules_start_time_end_time_idx').on(table.start_time, table.end_time),
    index('crossword_schedules_end_time_idx').on(table.end_time),
    index('crossword_schedules_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at),
    index('crossword_schedules_created_at_idx').on(table.created_at)
  ]
);

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
import { relations } from 'drizzle-orm';

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
    location: varchar({ length: 25 }).$type<location_list_type>(),
    /** Better Auth user id; null for anonymous plays */
    user_id: text(),
    /** Display-name snapshot at play time (auth lives on a separate service) */
    user_name: text()
  },
  (table) => [
    index('crossword_sessions_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at),
    index('crossword_sessions_user_id_created_at_idx').on(table.user_id, table.created_at),
    index('crossword_sessions_user_id_puzzle_id_idx').on(table.user_id, table.puzzle_id),
    index('crossword_sessions_puzzle_id_user_id_idx').on(table.puzzle_id, table.user_id)
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

/** Relations */

export const crossword_puzzlesRelations = relations(crossword_puzzles, ({ many, one }) => ({
  stats: many(crossword_gameplay_stats),
  schedules: many(crossword_schedules),
  sessions: many(crossword_sessions),
  attachments: many(crossword_attachments),
  image: one(image_assets, {
    fields: [crossword_puzzles.image_id],
    references: [image_assets.id]
  }),
  redirects: many(crossword_redirects)
}));

export const crossword_puzzle_redirectsRelations = relations(crossword_redirects, ({ one }) => ({
  puzzle: one(crossword_puzzles, {
    fields: [crossword_redirects.puzzle_id],
    references: [crossword_puzzles.id]
  })
}));

export const crossword_puzzle_attachmentsRelations = relations(
  crossword_attachments,
  ({ one }) => ({
    puzzle: one(crossword_puzzles, {
      fields: [crossword_attachments.puzzle_id],
      references: [crossword_puzzles.id]
    })
  })
);

export const crossword_puzzle_gameplay_sessionsRelations = relations(
  crossword_sessions,
  ({ one }) => ({
    puzzle: one(crossword_puzzles, {
      fields: [crossword_sessions.puzzle_id],
      references: [crossword_puzzles.id]
    }),
    stats: one(crossword_gameplay_stats)
  })
);

export const crossword_puzzle_gameplay_statsRelations = relations(
  crossword_gameplay_stats,
  ({ one }) => ({
    puzzle: one(crossword_puzzles, {
      fields: [crossword_gameplay_stats.puzzle_id],
      references: [crossword_puzzles.id]
    }),
    session: one(crossword_sessions, {
      fields: [crossword_gameplay_stats.session_id],
      references: [crossword_sessions.id]
    })
  })
);

export const crossword_puzzle_game_schedulesRelations = relations(
  crossword_schedules,
  ({ one }) => ({
    puzzle: one(crossword_puzzles, {
      fields: [crossword_schedules.puzzle_id],
      references: [crossword_puzzles.id]
    })
  })
);

import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { GameKind } from '~/util/catalog/tags';
import type { location_list_type } from '../types';
import type { ScriptType } from '~/state/script_list';
import { attachment_type_enum, collections, image_assets, tags } from './common_schema';

export const puzzles = pgTable(
  'puzzles',
  {
    id: serial().primaryKey(),
    /** Game id. Text so a new game does not need an enum migration. */
    kind: text().notNull().$type<GameKind>(),
    uid: text().notNull().unique(),
    slug: text().notNull(),
    title: text().notNull(),
    description: text().notNull().default(''),
    listed: boolean().notNull().default(false),
    last_listed_at: timestamp({ withTimezone: true }),
    image_id: integer().references(() => image_assets.id, { onDelete: 'set null' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
  },
  (table) => [
    /** Composite target so redirects can require `kind` to match the puzzle row. */
    uniqueIndex('puzzles_id_kind_idx').on(table.id, table.kind),
    uniqueIndex('puzzles_kind_slug_idx').on(table.kind, table.slug),
    index('puzzles_listed_created_at_idx').on(table.listed, table.created_at),
    index('puzzles_listed_updated_at_idx').on(table.listed, table.updated_at),
    index('puzzles_listed_last_listed_at_idx').on(table.listed, table.last_listed_at),
    index('puzzles_kind_listed_idx').on(table.kind, table.listed)
  ]
);

export const puzzle_tags = pgTable(
  'puzzle_tags',
  {
    puzzle_id: integer()
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    tag_id: integer()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' })
  },
  (table) => [
    primaryKey({ columns: [table.puzzle_id, table.tag_id] }),
    index('puzzle_tags_tag_id_idx').on(table.tag_id)
  ]
);

export const collection_items = pgTable(
  'collection_items',
  {
    collection_id: integer()
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    puzzle_id: integer()
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    /** Display order within the collection. Gaps are allowed; sort ascending. */
    order_index: smallint().notNull().default(1),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.collection_id, table.puzzle_id] }),
    index('collection_items_puzzle_id_idx').on(table.puzzle_id),
    index('collection_items_collection_order_idx').on(table.collection_id, table.order_index)
  ]
);

/**
 * Old play URLs. `slug` is unique per game, because the same old slug can exist
 * under two game paths.
 */
export const puzzle_redirects = pgTable(
  'puzzle_redirects',
  {
    id: serial().primaryKey(),
    puzzle_id: integer().notNull(),
    kind: text().notNull().$type<GameKind>(),
    slug: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('puzzle_redirects_kind_slug_idx').on(table.kind, table.slug),
    index('puzzle_redirects_puzzle_id_idx').on(table.puzzle_id),
    foreignKey({
      columns: [table.puzzle_id, table.kind],
      foreignColumns: [puzzles.id, puzzles.kind],
      name: 'puzzle_redirects_puzzle_id_kind_fk'
    }).onDelete('cascade')
  ]
);

export const puzzle_attachments = pgTable(
  'puzzle_attachments',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    type: attachment_type_enum().notNull(),
    url: text().notNull(),
    title: text(),
    order_index: smallint().notNull().default(1),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
  },
  (table) => [index('puzzle_attachments_puzzle_id_idx').on(table.puzzle_id)]
);

export const puzzle_schedules = pgTable(
  'puzzle_schedules',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    start_time: timestamp({ withTimezone: true }).notNull(),
    end_time: timestamp({ withTimezone: true }).notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
    listing_verify_key: text()
  },
  (table) => [
    index('puzzle_schedules_start_time_end_time_idx').on(table.start_time, table.end_time),
    index('puzzle_schedules_end_time_idx').on(table.end_time),
    index('puzzle_schedules_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at),
    index('puzzle_schedules_created_at_idx').on(table.created_at)
  ]
);

export const puzzle_sessions = pgTable(
  'puzzle_sessions',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Padavali only. Other games store false. */
    practice_mode: boolean().notNull().default(false),
    location: varchar({ length: 25 }).$type<location_list_type>(),
    /** Padavali and the simple games. Crossword stores null. */
    script: text().$type<ScriptType>(),
    /** Better Auth user id; null for anonymous plays */
    user_id: text()
  },
  (table) => [
    index('puzzle_sessions_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at),
    index('puzzle_sessions_user_id_created_at_idx').on(table.user_id, table.created_at),
    index('puzzle_sessions_user_id_puzzle_id_idx').on(table.user_id, table.puzzle_id),
    index('puzzle_sessions_puzzle_id_user_id_idx').on(table.puzzle_id, table.user_id)
  ]
);

/** Word-attempt stats shared by padavali and the simple games. */
export const attempt_gameplay_stats = pgTable(
  'attempt_gameplay_stats',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    session_id: integer()
      .notNull()
      .references(() => puzzle_sessions.id, { onDelete: 'cascade' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    time_taken: integer().notNull(),
    accuracy: integer().notNull(),
    correct_attempts: integer().notNull(),
    total_attempts: integer().notNull()
  },
  (table) => [
    index('attempt_gameplay_stats_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at),
    uniqueIndex('attempt_gameplay_stats_session_id_idx').on(table.session_id)
  ]
);

/** Grid-entry stats. Columns do not match `attempt_gameplay_stats`. */
export const crossword_gameplay_stats = pgTable(
  'crossword_gameplay_stats',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    session_id: integer()
      .notNull()
      .references(() => puzzle_sessions.id, { onDelete: 'cascade' }),
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

export const puzzle_tagsRelations = relations(puzzle_tags, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [puzzle_tags.puzzle_id],
    references: [puzzles.id]
  }),
  tag: one(tags, {
    fields: [puzzle_tags.tag_id],
    references: [tags.id]
  })
}));

export const collection_itemsRelations = relations(collection_items, ({ one }) => ({
  collection: one(collections, {
    fields: [collection_items.collection_id],
    references: [collections.id]
  }),
  puzzle: one(puzzles, {
    fields: [collection_items.puzzle_id],
    references: [puzzles.id]
  })
}));

export const puzzle_redirectsRelations = relations(puzzle_redirects, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [puzzle_redirects.puzzle_id],
    references: [puzzles.id]
  })
}));

export const puzzle_attachmentsRelations = relations(puzzle_attachments, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [puzzle_attachments.puzzle_id],
    references: [puzzles.id]
  })
}));

export const puzzle_schedulesRelations = relations(puzzle_schedules, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [puzzle_schedules.puzzle_id],
    references: [puzzles.id]
  })
}));

export const puzzle_sessionsRelations = relations(puzzle_sessions, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [puzzle_sessions.puzzle_id],
    references: [puzzles.id]
  }),
  attempt_stats: one(attempt_gameplay_stats),
  crossword_stats: one(crossword_gameplay_stats)
}));

export const attempt_gameplay_statsRelations = relations(attempt_gameplay_stats, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [attempt_gameplay_stats.puzzle_id],
    references: [puzzles.id]
  }),
  session: one(puzzle_sessions, {
    fields: [attempt_gameplay_stats.session_id],
    references: [puzzle_sessions.id]
  })
}));

export const crossword_gameplay_statsRelations = relations(crossword_gameplay_stats, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [crossword_gameplay_stats.puzzle_id],
    references: [puzzles.id]
  }),
  session: one(puzzle_sessions, {
    fields: [crossword_gameplay_stats.session_id],
    references: [puzzle_sessions.id]
  })
}));

import {
  pgTable,
  serial,
  jsonb,
  text,
  timestamp,
  index,
  integer,
  boolean,
  varchar,
  uniqueIndex,
  pgEnum,
  smallint,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { location_list_type } from './types';
import { type ScriptType } from '~/state/script_list';
import { ATTACHMENT_TYPE_LIST } from './db_shared_vals';
import { BatchMetadata } from '~/util/types/ai_batch_metadata';
import type { CrossordPuzzleGridCell, CrossWordPuzzleWord } from '~/db/schema_zod';

export const padavali_puzzles = pgTable(
  'padavali_puzzles',
  {
    id: serial().primaryKey(),
    slug: text().notNull(),
    title: text().notNull(),
    description: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date()), // NULL for not updated
    word_list: jsonb().notNull().$type<string[]>(),
    grid_data: jsonb().notNull().$type<string[][]>(),
    grid_dimensions: jsonb().notNull().$type<[number, number]>(),
    /** Whether the puzzle is listed publically on the website */
    listed: boolean().notNull().default(false),
    last_listed_at: timestamp({ withTimezone: true }),
    image_id: integer().references(() => image_assets.id, { onDelete: 'set null' })
  },
  (table) => [
    uniqueIndex('padavali_puzzles_slug_idx').on(table.slug),
    index('padavali_puzzles_listed_created_at_idx').on(table.listed, table.created_at),
    index('padavali_puzzles_listed_updated_at_idx').on(table.listed, table.updated_at),
    index('padavali_puzzles_listed_last_listed_at_idx').on(table.listed, table.last_listed_at)
  ]
);

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

export const image_assets = pgTable('image_assets', {
  id: serial().primaryKey(),
  description: varchar('description', { length: 150 }),
  width: smallint().notNull(),
  height: smallint().notNull(),
  s3_key: text().notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
});

/**
 * Used to redirect old URLs to the new ones (like after we change the slug)
 */
export const padavali_redirects = pgTable('padavali_redirects', {
  id: serial().primaryKey(),
  puzzle_id: integer()
    .notNull()
    .references(() => padavali_puzzles.id, { onDelete: 'cascade' }),
  /** The old slug from which we would redirect to the new slug */
  slug: text().notNull().unique(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
});

export const attachment_type_enum = pgEnum('attachment_type', ATTACHMENT_TYPE_LIST);

export const padavali_attachments = pgTable(
  'padavali_attachments',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => padavali_puzzles.id, { onDelete: 'cascade' }),
    type: attachment_type_enum().notNull(),
    url: text().notNull(),
    title: text(),
    order_index: smallint().notNull().default(1), // starts from 1
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
  },
  (table) => [index('padavali_attachments_puzzle_id_idx').on(table.puzzle_id)]
);

export const padavali_sessions = pgTable(
  'padavali_sessions',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => padavali_puzzles.id, { onDelete: 'cascade' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    practice_mode: boolean().notNull().default(false),
    location: varchar({ length: 25 }).$type<location_list_type>(),
    script: text().$type<ScriptType>()
    // as the script field was added late, we have handle it accordingly in th code
  },
  (table) => [
    index('padavali_sessions_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at)
  ]
);

export const padavali_gameplay_stats = pgTable(
  'padavali_gameplay_stats',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => padavali_puzzles.id, { onDelete: 'cascade' }),
    session_id: integer()
      .notNull()
      .references(() => padavali_sessions.id, { onDelete: 'cascade' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    time_taken: integer().notNull(),
    accuracy: integer().notNull(),
    correct_attempts: integer().notNull(),
    total_attempts: integer().notNull()
  },
  (table) => [
    index('padavali_gameplay_stats_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at),
    uniqueIndex('padavali_gameplay_stats_session_id_idx').on(table.session_id)
  ]
);

export const padavali_schedules = pgTable(
  'padavali_schedules',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => padavali_puzzles.id, { onDelete: 'cascade' }),
    start_time: timestamp({ withTimezone: true }).notNull(),
    end_time: timestamp({ withTimezone: true }).notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
    listing_verify_key: text(),
    notification_key: text()
  },
  (table) => [
    index('padavali_schedules_start_time_end_time_idx').on(table.start_time, table.end_time),
    index('padavali_schedules_end_time_idx').on(table.end_time),
    index('padavali_schedules_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at),
    index('padavali_schedules_created_at_idx').on(table.created_at)
  ]
);

/** One OpenAI Batch API job — shared fields for all custom_id responses in the batch. */
export const ai_batches = pgTable('ai_batches', {
  /** id returned by the Batch API */
  batch_id: text().primaryKey(),
  type: text().notNull().$type<'image' | 'text' | 'object'>(),
  /** whether OpenAI batch output has been fetched and applied to all response rows */
  output_resolved: boolean().notNull().default(false),
  /** Uploaded id for openai batch file input */
  input_file_id: text().notNull(),
  /** Uploaded id for openai batch file output (null until resolved) */
  output_file_id: text()
});

/** Per custom_id response / job within an OpenAI batch. */
export const ai_batch_responses = pgTable(
  'ai_batch_responses',
  {
    batch_id: text()
      .notNull()
      .references(() => ai_batches.batch_id, { onDelete: 'cascade' }),
    custom_id: text().notNull(),
    /** if the resource should be auto added to the main database */
    auto_approved: boolean().notNull().default(false),
    /** Extra info to store for future reference */
    metadata: jsonb().notNull().$type<BatchMetadata>()
  },
  (table) => [primaryKey({ columns: [table.batch_id, table.custom_id] })]
);

/** Relations */

export const word_puzzlesRelations = relations(padavali_puzzles, ({ many, one }) => ({
  stats: many(padavali_gameplay_stats),
  schedules: many(padavali_schedules),
  sessions: many(padavali_sessions),
  attachments: many(padavali_attachments),
  image: one(image_assets, {
    fields: [padavali_puzzles.image_id],
    references: [image_assets.id]
  }),
  redirects: many(padavali_redirects)
}));

export const word_puzzle_redirectsRelations = relations(padavali_redirects, ({ one }) => ({
  puzzle: one(padavali_puzzles, {
    fields: [padavali_redirects.puzzle_id],
    references: [padavali_puzzles.id]
  })
}));

export const word_puzzle_attachmentsRelations = relations(padavali_attachments, ({ one }) => ({
  puzzle: one(padavali_puzzles, {
    fields: [padavali_attachments.puzzle_id],
    references: [padavali_puzzles.id]
  })
}));

export const puzzle_gameplay_sessionsRelations = relations(padavali_sessions, ({ one }) => ({
  puzzle: one(padavali_puzzles, {
    fields: [padavali_sessions.puzzle_id],
    references: [padavali_puzzles.id]
  }),
  stats: one(padavali_gameplay_stats)
}));

export const puzzle_gameplay_statsRelations = relations(padavali_gameplay_stats, ({ one }) => ({
  puzzle: one(padavali_puzzles, {
    fields: [padavali_gameplay_stats.puzzle_id],
    references: [padavali_puzzles.id]
  }),
  session: one(padavali_sessions, {
    fields: [padavali_gameplay_stats.session_id],
    references: [padavali_sessions.id]
  })
}));

export const puzzle_game_schedulesRelations = relations(padavali_schedules, ({ one }) => ({
  puzzle: one(padavali_puzzles, {
    fields: [padavali_schedules.puzzle_id],
    references: [padavali_puzzles.id]
  })
}));

export const ai_batchesRelations = relations(ai_batches, ({ many }) => ({
  responses: many(ai_batch_responses)
}));

export const ai_batch_responsesRelations = relations(ai_batch_responses, ({ one }) => ({
  batch: one(ai_batches, {
    fields: [ai_batch_responses.batch_id],
    references: [ai_batches.batch_id]
  })
}));

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
  smallint
} from 'drizzle-orm/pg-core';
import type { location_list_type } from '../types';
import { type ScriptType } from '~/state/script_list';
import { image_assets, attachment_type_enum } from './common_schema';

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

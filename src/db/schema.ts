import {
  pgTable,
  serial,
  jsonb,
  text,
  timestamp,
  index,
  uuid,
  integer,
  boolean,
  varchar,
  uniqueIndex,
  pgEnum,
  smallint
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { location_list_type } from './types';
import { type ScriptType } from '~/state/script_list';
import { ATTACHMENT_TYPE_LIST } from './db_shared_vals';

export const word_puzzles = pgTable(
  'word_puzzles',
  {
    id: serial().primaryKey(),
    uuid: uuid().unique().notNull().defaultRandom(),
    title: text().notNull(),
    description: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date()), // NULL for not updated
    word_list: jsonb().notNull().$type<string[]>(),
    grid_data: jsonb().notNull().$type<string[][]>(),
    grid_dimensions: jsonb().notNull().$type<[number, number]>(),
    archived: boolean().notNull().default(false),
    last_archived_at: timestamp({ withTimezone: true })
  },
  (table) => [
    uniqueIndex('word_puzzles_uuid_idx').on(table.uuid),
    index('word_puzzles_archived_created_at_idx').on(table.archived, table.created_at),
    index('word_puzzles_archived_last_archived_at_idx').on(table.archived, table.last_archived_at)
  ]
);

export const attachment_type_enum = pgEnum('attachment_type', ATTACHMENT_TYPE_LIST);
export const word_puzzle_attachments = pgTable(
  'word_puzzle_attachments',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => word_puzzles.id, { onDelete: 'cascade' }),
    type: attachment_type_enum().notNull(),
    url: text().notNull(),
    title: text(),
    order_index: smallint().notNull().default(1), // starts from 1
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
  },
  (table) => [index('word_puzzle_attachments_puzzle_id_idx').on(table.puzzle_id)]
);

export const puzzle_gameplay_sessions = pgTable(
  'puzzle_gameplay_sessions',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => word_puzzles.id, { onDelete: 'cascade' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    location: varchar({ length: 25 }).$type<location_list_type>(),
    script: text().$type<ScriptType>()
    // as the script field was added late, we have handle it accordingly in th code
  },
  (table) => [
    index('puzzle_gameplay_sessions_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at)
  ]
);

export const puzzle_gameplay_stats = pgTable(
  'puzzle_gameplay_stats',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => word_puzzles.id, { onDelete: 'cascade' }),
    session_id: integer()
      .notNull()
      .references(() => puzzle_gameplay_sessions.id, { onDelete: 'cascade' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    time_taken: integer().notNull(),
    accuracy: integer().notNull(),
    correct_attempts: integer().notNull(),
    total_attempts: integer().notNull()
  },
  (table) => [
    index('puzzle_gameplay_stats_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at),
    uniqueIndex('puzzle_gameplay_stats_session_id_idx').on(table.session_id)
  ]
);

export const puzzle_game_schedules = pgTable(
  'puzzle_game_schedules',
  {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => word_puzzles.id, { onDelete: 'cascade' }),
    start_time: timestamp({ withTimezone: true }).notNull(),
    end_time: timestamp({ withTimezone: true }).notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
  },
  (table) => [
    index('puzzle_game_schedules_start_time_end_time_idx').on(table.start_time, table.end_time),
    index('puzzle_game_schedules_end_time_idx').on(table.end_time),
    index('puzzle_game_schedules_puzzle_id_created_at_idx').on(table.puzzle_id, table.created_at),
    index('puzzle_game_schedules_created_at_idx').on(table.created_at)
  ]
);

// relations

export const word_puzzlesRelations = relations(word_puzzles, ({ many }) => ({
  stats: many(puzzle_gameplay_stats),
  schedules: many(puzzle_game_schedules),
  sessions: many(puzzle_gameplay_sessions),
  attachments: many(word_puzzle_attachments)
}));

export const word_puzzle_attachmentsRelations = relations(word_puzzle_attachments, ({ one }) => ({
  puzzle: one(word_puzzles, {
    fields: [word_puzzle_attachments.puzzle_id],
    references: [word_puzzles.id]
  })
}));

export const puzzle_gameplay_sessionsRelations = relations(puzzle_gameplay_sessions, ({ one }) => ({
  puzzle: one(word_puzzles, {
    fields: [puzzle_gameplay_sessions.puzzle_id],
    references: [word_puzzles.id]
  }),
  stats: one(puzzle_gameplay_stats)
}));

export const puzzle_gameplay_statsRelations = relations(puzzle_gameplay_stats, ({ one }) => ({
  puzzle: one(word_puzzles, {
    fields: [puzzle_gameplay_stats.puzzle_id],
    references: [word_puzzles.id]
  }),
  session: one(puzzle_gameplay_sessions, {
    fields: [puzzle_gameplay_stats.session_id],
    references: [puzzle_gameplay_sessions.id]
  })
}));

export const puzzle_game_schedulesRelations = relations(puzzle_game_schedules, ({ one }) => ({
  puzzle: one(word_puzzles, {
    fields: [puzzle_game_schedules.puzzle_id],
    references: [word_puzzles.id]
  })
}));

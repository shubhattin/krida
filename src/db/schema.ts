import {
  pgTable,
  serial,
  jsonb,
  text,
  timestamp,
  index,
  uuid,
  integer,
  boolean
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const word_puzzles = pgTable(
  'word_puzzles',
  {
    id: serial().primaryKey(),
    uuid: uuid().notNull().defaultRandom(),
    title: text().notNull(),
    description: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }), // NULL for not updated
    word_list: jsonb().notNull().$type<string[]>(),
    grid_data: jsonb().notNull().$type<string[][]>(),
    grid_dimensions: jsonb().notNull().$type<[number, number]>(),
    archived: boolean().notNull().default(false)
  },
  (table) => [index().on(table.created_at)]
);

export const puzzle_gameplay_stats = pgTable('puzzle_gameplay_stats', {
  id: serial().primaryKey(),
  puzzle_id: integer()
    .notNull()
    .references(() => word_puzzles.id, { onDelete: 'cascade' }),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  time_taken: integer().notNull(),
  accuracy: integer().notNull(),
  correct_attempts: integer().notNull(),
  total_attempts: integer().notNull()
});

export const puzzle_game_schedules = pgTable('puzzle_game_schedules', {
  id: serial().primaryKey(),
  puzzle_id: integer()
    .notNull()
    .references(() => word_puzzles.id, { onDelete: 'cascade' }),
  start_time: timestamp({ withTimezone: true }).notNull(),
  end_time: timestamp({ withTimezone: true }).notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  completed: boolean().notNull().default(false)
});

// relations

export const word_puzzlesRelations = relations(word_puzzles, ({ many }) => ({
  stats: many(puzzle_gameplay_stats),
  schedules: many(puzzle_game_schedules)
}));

export const puzzle_gameplay_statsRelations = relations(puzzle_gameplay_stats, ({ one }) => ({
  puzzle: one(word_puzzles, {
    fields: [puzzle_gameplay_stats.puzzle_id],
    references: [word_puzzles.id]
  })
}));

export const puzzle_game_schedulesRelations = relations(puzzle_game_schedules, ({ one }) => ({
  puzzle: one(word_puzzles, {
    fields: [puzzle_game_schedules.puzzle_id],
    references: [word_puzzles.id]
  })
}));

import { pgTable, serial, jsonb, text, timestamp, index, uuid, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const word_puzzles = pgTable(
  'word_puzzles',
  {
    id: serial().primaryKey(),
    uuid: uuid().notNull().defaultRandom(),
    title: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }), // NULL for not updated
    word_list: jsonb().notNull().$type<string[]>(),
    grid_data: jsonb().notNull().$type<string[][]>(),
    grid_dimensions: jsonb().notNull().$type<[number, number]>()
  },
  (table) => [index().on(table.created_at)]
);

export const puzzle_gameplay_stats = pgTable('puzzle_gameplay_stats', {
  id: serial().primaryKey(),
  puzzle_id: integer()
    .notNull()
    .references(() => word_puzzles.id),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  time_taken: integer().notNull(),
  accuracy: integer().notNull(),
  correct_attempts: integer().notNull(),
  total_attempts: integer().notNull()
});

// relations

export const word_puzzlesRelations = relations(word_puzzles, ({ many }) => ({
  stats: many(puzzle_gameplay_stats)
}));

export const puzzle_gameplay_statsRelations = relations(puzzle_gameplay_stats, ({ one }) => ({
  puzzle: one(word_puzzles, {
    fields: [puzzle_gameplay_stats.puzzle_id],
    references: [word_puzzles.id]
  })
}));

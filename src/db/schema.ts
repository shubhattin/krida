import { pgTable, serial, jsonb, text, timestamp, index, uuid, integer } from 'drizzle-orm/pg-core';

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

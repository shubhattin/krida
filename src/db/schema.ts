import { pgTable, serial, jsonb, text, timestamp, index, uuid } from 'drizzle-orm/pg-core';

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

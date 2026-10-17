import { integer, jsonb, pgTable } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { puzzles } from './puzzles_schema';

export const padavali_puzzles = pgTable('padavali_puzzles', {
  id: integer()
    .primaryKey()
    .references(() => puzzles.id, { onDelete: 'cascade' }),
  word_list: jsonb().notNull().$type<
    {
      word: string;
      added: boolean;
    }[]
  >(),
  grid_data: jsonb().notNull().$type<string[][]>(),
  grid_dimensions: jsonb().notNull().$type<[number, number]>()
});

export const padavali_puzzlesRelations = relations(padavali_puzzles, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [padavali_puzzles.id],
    references: [puzzles.id]
  })
}));

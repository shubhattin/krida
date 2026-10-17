import { integer, jsonb, pgTable } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { CrossordPuzzleGridCell, CrossWordPuzzleWord } from '~/db/schema_zod';
import { puzzles } from './puzzles_schema';

export const crossword_puzzles = pgTable('crossword_puzzles', {
  id: integer()
    .primaryKey()
    .references(() => puzzles.id, { onDelete: 'cascade' }),
  /** Grid size as [rows, cols] */
  grid_dimensions: jsonb().notNull().$type<[number, number]>(),
  /** Blank text = blocked box; letter cells are playable (is_visible = prefilled hint). */
  grid_data: jsonb().notNull().$type<CrossordPuzzleGridCell[][]>(),
  word_list: jsonb().notNull().$type<CrossWordPuzzleWord[]>()
});

export const crossword_puzzlesRelations = relations(crossword_puzzles, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [crossword_puzzles.id],
    references: [puzzles.id]
  })
}));

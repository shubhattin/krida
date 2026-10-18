import { integer, jsonb, pgTable } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { CrossordPuzzleGridCell, PadajalaPuzzleWord } from '~/db/schema_zod';
import { puzzles } from './puzzles_schema';

export const padajala_puzzles = pgTable('padajala_puzzles', {
  id: integer()
    .primaryKey()
    .references(() => puzzles.id, { onDelete: 'cascade' }),
  /** Grid size as [rows, cols] */
  grid_dimensions: jsonb().notNull().$type<[number, number]>(),
  /** Blank text = blocked box; letter cells are playable (is_visible = prefilled hint). */
  grid_data: jsonb().notNull().$type<CrossordPuzzleGridCell[][]>(),
  word_list: jsonb().notNull().$type<PadajalaPuzzleWord[]>()
});

export const padajala_puzzlesRelations = relations(padajala_puzzles, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [padajala_puzzles.id],
    references: [puzzles.id]
  })
}));

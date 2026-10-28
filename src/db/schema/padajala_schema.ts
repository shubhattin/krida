import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { CrossordPuzzleGridCell, PadajalaPuzzleWord } from '~/db/schema_zod';
import type { MoreHintsType } from '~/util/ai/ai_content_schemas';
import { puzzles } from './puzzles_schema';

export const padajala_puzzles = pgTable('padajala_puzzles', {
  id: integer()
    .primaryKey()
    .references(() => puzzles.id, { onDelete: 'cascade' }),
  /** Grid size as [rows, cols] */
  grid_dimensions: jsonb().notNull().$type<[number, number]>(),
  /** Blank text = blocked box; letter cells are playable (is_visible = prefilled hint). */
  grid_data: jsonb().notNull().$type<CrossordPuzzleGridCell[][]>(),
  word_list: jsonb().notNull().$type<PadajalaPuzzleWord[]>(),
  /** AI more hints; null until generated, cleared when title/description/words/clues change */
  more_hints: jsonb().$type<MoreHintsType>(),
  /** sha256 of the inputs + prompt version `more_hints` was generated from */
  more_hints_hash: text(),
  more_hints_generated_at: timestamp({ withTimezone: true })
});

export const padajala_puzzlesRelations = relations(padajala_puzzles, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [padajala_puzzles.id],
    references: [puzzles.id]
  })
}));

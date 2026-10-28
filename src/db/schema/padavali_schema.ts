import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { WordMeaningsType } from '~/util/ai/ai_content_schemas';
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
  grid_dimensions: jsonb().notNull().$type<[number, number]>(),
  /** AI word meanings; null until generated, cleared when title/description/words change */
  word_meanings: jsonb().$type<WordMeaningsType>(),
  /** sha256 of the inputs + prompt version `word_meanings` was generated from */
  word_meanings_hash: text(),
  word_meanings_generated_at: timestamp({ withTimezone: true })
});

export const padavali_puzzlesRelations = relations(padavali_puzzles, ({ one }) => ({
  puzzle: one(puzzles, {
    fields: [padavali_puzzles.id],
    references: [puzzles.id]
  })
}));

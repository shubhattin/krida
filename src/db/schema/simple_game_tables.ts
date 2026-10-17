import { integer, jsonb, pgTable } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { SimpleGameKind } from '~/util/games/kinds';
import { puzzles } from './puzzles_schema';

type SimpleGameTables<TPuzzleData> = ReturnType<typeof defineSimpleGameTables<TPuzzleData>>;

export function defineSimpleGameTables<TPuzzleData>(game: SimpleGameKind) {
  const game_puzzles = pgTable(`${game}_puzzles`, {
    id: integer()
      .primaryKey()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    puzzle_data: jsonb().notNull().$type<TPuzzleData>()
  });

  const puzzlesRelations = relations(game_puzzles, ({ one }) => ({
    puzzle: one(puzzles, {
      fields: [game_puzzles.id],
      references: [puzzles.id]
    })
  }));

  return {
    puzzles: game_puzzles,
    puzzlesRelations
  };
}

export type SimpleGameTableSet<TPuzzleData> = SimpleGameTables<TPuzzleData>;

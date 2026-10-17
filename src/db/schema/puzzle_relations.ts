import { relations } from 'drizzle-orm';
import { image_assets } from './common_schema';
import { anveshi_puzzles } from './anveshi_schema';
import { bhramita_puzzles } from './bhramita_schema';
import { crossword_puzzles } from './crossword_schema';
import { dvayi_puzzles } from './dvayi_schema';
import { padavali_puzzles } from './padavali_schema';
import {
  attempt_gameplay_stats,
  collection_items,
  crossword_gameplay_stats,
  puzzle_attachments,
  puzzle_redirects,
  puzzle_schedules,
  puzzle_sessions,
  puzzle_tags,
  puzzles
} from './puzzles_schema';
import { surupa_puzzles } from './surupa_schema';

/**
 * Supertype relations live here so `puzzles_schema` does not import the game
 * payload tables (those already import `puzzles`).
 */
export const puzzlesRelations = relations(puzzles, ({ many, one }) => ({
  image: one(image_assets, {
    fields: [puzzles.image_id],
    references: [image_assets.id]
  }),
  puzzle_tags: many(puzzle_tags),
  collection_items: many(collection_items),
  redirects: many(puzzle_redirects),
  attachments: many(puzzle_attachments),
  schedules: many(puzzle_schedules),
  sessions: many(puzzle_sessions),
  attempt_stats: many(attempt_gameplay_stats),
  crossword_stats: many(crossword_gameplay_stats),
  padavali: one(padavali_puzzles),
  crossword: one(crossword_puzzles),
  dvayi: one(dvayi_puzzles),
  bhramita: one(bhramita_puzzles),
  surupa: one(surupa_puzzles),
  anveshi: one(anveshi_puzzles)
}));

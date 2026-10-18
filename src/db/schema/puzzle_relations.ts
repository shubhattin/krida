import { relations } from 'drizzle-orm';
import { image_assets } from './common_schema';
import { anveshi_puzzles } from './anveshi_schema';
import { bhramita_puzzles } from './bhramita_schema';
import { padajala_puzzles } from './padajala_schema';
import { dvayi_puzzles } from './dvayi_schema';
import { padavali_puzzles } from './padavali_schema';
import {
  attempt_gameplay_stats,
  collection_items,
  padajala_gameplay_stats,
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
  padajala_stats: many(padajala_gameplay_stats),
  padavali: one(padavali_puzzles, {
    fields: [puzzles.id],
    references: [padavali_puzzles.id]
  }),
  padajala: one(padajala_puzzles, {
    fields: [puzzles.id],
    references: [padajala_puzzles.id]
  }),
  dvayi: one(dvayi_puzzles, {
    fields: [puzzles.id],
    references: [dvayi_puzzles.id]
  }),
  bhramita: one(bhramita_puzzles, {
    fields: [puzzles.id],
    references: [bhramita_puzzles.id]
  }),
  surupa: one(surupa_puzzles, {
    fields: [puzzles.id],
    references: [surupa_puzzles.id]
  }),
  anveshi: one(anveshi_puzzles, {
    fields: [puzzles.id],
    references: [anveshi_puzzles.id]
  })
}));

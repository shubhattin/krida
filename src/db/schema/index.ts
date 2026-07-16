import { relations } from 'drizzle-orm';
import {
  padavali_puzzles,
  padavali_gameplay_stats,
  padavali_schedules,
  padavali_sessions,
  padavali_attachments,
  padavali_redirects
} from './padavali_schema';
import { image_assets, ai_batches, ai_batch_responses } from './common_schema';

export * from './common_schema';
export * from './padavali_schema';
export * from './crossword_schema';

/** Relations */

export const padavali_puzzlesRelations = relations(padavali_puzzles, ({ many, one }) => ({
  stats: many(padavali_gameplay_stats),
  schedules: many(padavali_schedules),
  sessions: many(padavali_sessions),
  attachments: many(padavali_attachments),
  image: one(image_assets, {
    fields: [padavali_puzzles.image_id],
    references: [image_assets.id]
  }),
  redirects: many(padavali_redirects)
}));

export const padavali_puzzle_redirectsRelations = relations(padavali_redirects, ({ one }) => ({
  puzzle: one(padavali_puzzles, {
    fields: [padavali_redirects.puzzle_id],
    references: [padavali_puzzles.id]
  })
}));

export const padavali_puzzle_attachmentsRelations = relations(padavali_attachments, ({ one }) => ({
  puzzle: one(padavali_puzzles, {
    fields: [padavali_attachments.puzzle_id],
    references: [padavali_puzzles.id]
  })
}));

export const padavali_puzzle_gameplay_sessionsRelations = relations(
  padavali_sessions,
  ({ one }) => ({
    puzzle: one(padavali_puzzles, {
      fields: [padavali_sessions.puzzle_id],
      references: [padavali_puzzles.id]
    }),
    stats: one(padavali_gameplay_stats)
  })
);

export const padavali_puzzle_gameplay_statsRelations = relations(
  padavali_gameplay_stats,
  ({ one }) => ({
    puzzle: one(padavali_puzzles, {
      fields: [padavali_gameplay_stats.puzzle_id],
      references: [padavali_puzzles.id]
    }),
    session: one(padavali_sessions, {
      fields: [padavali_gameplay_stats.session_id],
      references: [padavali_sessions.id]
    })
  })
);

export const padavali_puzzle_game_schedulesRelations = relations(padavali_schedules, ({ one }) => ({
  puzzle: one(padavali_puzzles, {
    fields: [padavali_schedules.puzzle_id],
    references: [padavali_puzzles.id]
  })
}));

export const ai_batchesRelations = relations(ai_batches, ({ many }) => ({
  responses: many(ai_batch_responses)
}));

export const ai_batch_responsesRelations = relations(ai_batch_responses, ({ one }) => ({
  batch: one(ai_batches, {
    fields: [ai_batch_responses.batch_id],
    references: [ai_batches.batch_id]
  })
}));

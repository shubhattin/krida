import { relations } from 'drizzle-orm';
import {
  padavali_puzzles,
  padavali_gameplay_stats,
  padavali_schedules,
  padavali_sessions,
  padavali_attachments,
  padavali_redirects
} from './padavali_schema';
import {
  crossword_puzzles,
  crossword_gameplay_stats,
  crossword_schedules,
  crossword_sessions,
  crossword_attachments,
  crossword_redirects
} from './crossword_schema';
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

export const crossword_puzzlesRelations = relations(crossword_puzzles, ({ many, one }) => ({
  stats: many(crossword_gameplay_stats),
  schedules: many(crossword_schedules),
  sessions: many(crossword_sessions),
  attachments: many(crossword_attachments),
  image: one(image_assets, {
    fields: [crossword_puzzles.image_id],
    references: [image_assets.id]
  }),
  redirects: many(crossword_redirects)
}));

export const crossword_puzzle_redirectsRelations = relations(crossword_redirects, ({ one }) => ({
  puzzle: one(crossword_puzzles, {
    fields: [crossword_redirects.puzzle_id],
    references: [crossword_puzzles.id]
  })
}));

export const crossword_puzzle_attachmentsRelations = relations(
  crossword_attachments,
  ({ one }) => ({
    puzzle: one(crossword_puzzles, {
      fields: [crossword_attachments.puzzle_id],
      references: [crossword_puzzles.id]
    })
  })
);

export const crossword_puzzle_gameplay_sessionsRelations = relations(
  crossword_sessions,
  ({ one }) => ({
    puzzle: one(crossword_puzzles, {
      fields: [crossword_sessions.puzzle_id],
      references: [crossword_puzzles.id]
    }),
    stats: one(crossword_gameplay_stats)
  })
);

export const crossword_puzzle_gameplay_statsRelations = relations(
  crossword_gameplay_stats,
  ({ one }) => ({
    puzzle: one(crossword_puzzles, {
      fields: [crossword_gameplay_stats.puzzle_id],
      references: [crossword_puzzles.id]
    }),
    session: one(crossword_sessions, {
      fields: [crossword_gameplay_stats.session_id],
      references: [crossword_sessions.id]
    })
  })
);

export const crossword_puzzle_game_schedulesRelations = relations(
  crossword_schedules,
  ({ one }) => ({
    puzzle: one(crossword_puzzles, {
      fields: [crossword_schedules.puzzle_id],
      references: [crossword_puzzles.id]
    })
  })
);

export const ai_batchesRelations = relations(ai_batches, ({ many }) => ({
  responses: many(ai_batch_responses)
}));

export const ai_batch_responsesRelations = relations(ai_batch_responses, ({ one }) => ({
  batch: one(ai_batches, {
    fields: [ai_batch_responses.batch_id],
    references: [ai_batches.batch_id]
  })
}));

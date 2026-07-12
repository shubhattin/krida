import { z } from 'zod';
import {
  word_puzzles,
  puzzle_gameplay_stats,
  puzzle_game_schedules,
  puzzle_gameplay_sessions,
  word_puzzle_attachments,
  ai_batch_responses,
  ai_batches,
  word_puzzle_redirects,
  image_assets
} from './schema';
import { createSelectSchema } from 'drizzle-zod';
import { location_list_enum } from './types';
import { script_list_enum } from '~/state/script_list';
import { image_batch_metadata_schema } from '~/util/types/ai_batch_metadata';

export const WordPuzzleSchemaZod = createSelectSchema(word_puzzles, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
  last_listed_at: z.coerce.date().optional().nullable()
});

export const PuzzleGamePlayStatsSchemaZod = createSelectSchema(puzzle_gameplay_stats, {
  created_at: z.coerce.date()
});

export const PuzzleGameScheduleSchemaZod = createSelectSchema(puzzle_game_schedules, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date()
});

export const PuzzleGamePlaySessionSchemaZod = createSelectSchema(puzzle_gameplay_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum,
  script: script_list_enum.nullable().optional()
});

export const WordPuzzleAttachmentSchemaZod = createSelectSchema(word_puzzle_attachments, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});

export const AiBatchResponseSchemaZod = createSelectSchema(ai_batch_responses, {
  metadata: image_batch_metadata_schema.optional().nullable()
});

export const AiBatchSchemaZod = createSelectSchema(ai_batches);

export const WordPuzzleRedirectSchemaZod = createSelectSchema(word_puzzle_redirects, {
  created_at: z.coerce.date()
});

export const ImageAssetSchemaZod = createSelectSchema(image_assets, {
  created_at: z.coerce.date()
});

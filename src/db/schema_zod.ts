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
  image_assets,
  crossord_puzzles
} from './schema';
import { createSelectSchema } from 'drizzle-zod';
import { location_list_enum } from './types';
import { script_list_enum } from '~/state/script_list';
import { image_batch_metadata_schema } from '~/util/types/ai_batch_metadata';

export const WordPuzzleSchemaZod = createSelectSchema(word_puzzles, {
  word_list: z.string().array(),
  grid_data: z.string().array().array(),
  grid_dimensions: z.tuple([z.number().int().min(3), z.number().int().min(3)]),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
  last_listed_at: z.coerce.date().optional().nullable()
});

export const CrossWordPuzzleWordSchema = z.object({
  /** Only word is filled in manually, location and direction are calculated auto */
  word: z.string(),
  /** starting index in the nxn grid array */
  location: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  direction: z.enum(['horizontal', 'vertical']),
  description: z.string().optional().nullable().describe('Optional description of the word')
});
export const CrossordPuzzleGridCellSchema = z.object({
  /** Blank text = blocked box; any letter = playable cell */
  text: z.string().max(1).min(0).default(''),
  /** When true, the letter is shown to the player as a prefilled hint */
  is_visible: z.boolean().default(false)
});
export type CrossWordPuzzleWord = z.infer<typeof CrossWordPuzzleWordSchema>;
export type CrossordPuzzleGridCell = z.infer<typeof CrossordPuzzleGridCellSchema>;
export const CrossordPuzzleSchemaZod = createSelectSchema(crossord_puzzles, {
  /** (m,n) */
  grid_dimensions: z.tuple([z.number().int().min(3), z.number().int().min(3)]),
  word_list: CrossWordPuzzleWordSchema.array(),
  /** mxn grid; blank text cells are boxes, letters are playable */
  grid_data: CrossordPuzzleGridCellSchema.array().array(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
  last_listed_at: z.coerce.date().optional().nullable()
});
export type CrossordPuzzle = z.infer<typeof CrossordPuzzleSchemaZod>;

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

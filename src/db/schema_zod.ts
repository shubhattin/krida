import { z } from 'zod';
import {
  padavali_puzzles,
  padavali_gameplay_stats,
  padavali_schedules,
  padavali_sessions,
  padavali_attachments,
  ai_batch_responses,
  ai_batches,
  padavali_redirects,
  image_assets,
  crossword_puzzles,
  crossword_redirects,
  crossword_attachments,
  crossword_sessions,
  crossword_gameplay_stats,
  crossword_schedules
} from './schema';
import { createSelectSchema } from 'drizzle-zod';
import { location_list_enum } from './types';
import { script_list_enum } from '~/state/script_list';
import { image_batch_metadata_schema } from '~/util/types/ai_batch_metadata';

export const PadavaliPuzzleSchemaZod = createSelectSchema(padavali_puzzles, {
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
  /** Clue shown to the player — required and non-empty */
  description: z.string().trim().min(1, 'Clue is required')
});
export const CrossordPuzzleGridCellSchema = z.object({
  /** Blank text = blocked box; any letter = playable cell */
  text: z.string().max(1).min(0).default(''),
  /** When true, the letter is shown to the player as a prefilled hint */
  is_visible: z.boolean().default(false)
});
export type CrossWordPuzzleWord = z.infer<typeof CrossWordPuzzleWordSchema>;
export type CrossordPuzzleGridCell = z.infer<typeof CrossordPuzzleGridCellSchema>;
export const CrossordPuzzleSchemaZod = createSelectSchema(crossword_puzzles, {
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

export const PadavaliGamePlayStatsSchemaZod = createSelectSchema(padavali_gameplay_stats, {
  created_at: z.coerce.date()
});

export const PadavaliScheduleSchemaZod = createSelectSchema(padavali_schedules, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date()
});

export const PadavaliSessionSchemaZod = createSelectSchema(padavali_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum,
  script: script_list_enum.nullable().optional()
});

export const PadavaliAttachmentSchemaZod = createSelectSchema(padavali_attachments, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});

export const AiBatchResponseSchemaZod = createSelectSchema(ai_batch_responses, {
  metadata: image_batch_metadata_schema.optional().nullable()
});

export const AiBatchSchemaZod = createSelectSchema(ai_batches);

export const PadavaliRedirectSchemaZod = createSelectSchema(padavali_redirects, {
  created_at: z.coerce.date()
});

export const ImageAssetSchemaZod = createSelectSchema(image_assets, {
  created_at: z.coerce.date()
});

export const CrosswordRedirectSchemaZod = createSelectSchema(crossword_redirects, {
  created_at: z.coerce.date()
});

export const CrosswordAttachmentSchemaZod = createSelectSchema(crossword_attachments, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});

export const CrosswordSessionSchemaZod = createSelectSchema(crossword_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum
});

export const CrosswordGamePlayStatsSchemaZod = createSelectSchema(crossword_gameplay_stats, {
  created_at: z.coerce.date()
});

export const CrosswordScheduleSchemaZod = createSelectSchema(crossword_schedules, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date()
});

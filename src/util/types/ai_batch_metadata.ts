import { z } from 'zod';
import ms from 'ms';

/*
# Image Workflow
- We poll on specific intervals and upload to the bucket
- Store its reference in the metadata and then use it later
*/

/** Polling Interval for Batch API via QStash */
export const BATCH_POLLING_INTERVAL_S = ms('3mins') / 1000;

/** OpenAI batch completion window is 24h; stop QStash retries after that. */
export const MAX_BATCH_POLL_ATTEMPTS = Math.ceil((24 * 60 * 60) / BATCH_POLLING_INTERVAL_S);

export const puzzle_image_game_enum = z.enum(['padavali', 'crossword']);
export type PuzzleImageGame = z.infer<typeof puzzle_image_game_enum>;

/** Shared fields for puzzle-card image batch rows (padavali or crossword). */
const image_batch_metadata_base = z.object({
  puzzle_id: z.number().int(),
  /** Which game owns this puzzle_id. Defaults to padavali for older rows. */
  game: puzzle_image_game_enum.default('padavali'),
  image_prompt: z.string(),
  file_name: z.string(),
  image_description: z.string(),
  /** to be edited upon batch completion */
  success: z.boolean().optional(),
  /** image_assets id (upload after successful batch completion) */
  uploaded_image_id: z.number().int().optional(),
  /** set while a poll worker is processing this row */
  poll_claimed_at: z.string().optional()
});

/**
 * Padavali puzzle-image batch metadata.
 * `type: 'puzzle-image'` is kept for backward compatibility with existing rows.
 */
export const padavali_image_batch_metadata_schema = image_batch_metadata_base.extend({
  type: z.literal('puzzle-image'),
  game: z.literal('padavali').default('padavali')
});

/** Crossword puzzle-image batch metadata — uses a dedicated type discriminator. */
export const crossword_image_batch_metadata_schema = image_batch_metadata_base.extend({
  type: z.literal('crossword-puzzle-image'),
  game: z.literal('crossword').default('crossword')
});

/** @deprecated Prefer padavali_image_batch_metadata_schema; kept as alias for existing imports. */
export const image_batch_metadata_schema = padavali_image_batch_metadata_schema;

export const batch_metadata_schema = z.discriminatedUnion('type', [
  padavali_image_batch_metadata_schema,
  crossword_image_batch_metadata_schema
]);
export type BatchMetadata = z.infer<typeof batch_metadata_schema>;

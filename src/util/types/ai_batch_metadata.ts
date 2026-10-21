import { z } from 'zod';
import ms from 'ms';
import { KRIDAS } from '~/constants';
import { SIMPLE_GAME_KINDS } from '~/util/games/kinds';

/*
# Image Workflow
- We poll on specific intervals and upload to the bucket
- Store its reference in the metadata and then use it later
*/

/** Polling Interval for Batch API via QStash */
export const BATCH_POLLING_INTERVAL_S = ms('3mins') / 1000;

/** OpenAI batch completion window is 24h; stop QStash retries after that. */
export const MAX_BATCH_POLL_ATTEMPTS = Math.ceil((24 * 60 * 60) / BATCH_POLLING_INTERVAL_S);

export const puzzle_image_game_enum = z.enum(KRIDAS);
export type PuzzleImageGame = z.infer<typeof puzzle_image_game_enum>;

/** Games wired into background (batch) image generation (currently every krida). */
export function isPuzzleImageGame(game: string): game is PuzzleImageGame {
  return puzzle_image_game_enum.safeParse(game).success;
}

/** Shared fields for puzzle-card image batch rows (any krida). */
const image_batch_metadata_base = z.object({
  puzzle_id: z.number().int(),
  /** Which game owns this puzzle_id. Defaults to padavali for older rows. */
  game: puzzle_image_game_enum.default('padavali'),
  image_prompt: z.string(),
  file_name: z.string(),
  image_description: z.string(),
  /** Snapshot of the system prompt used to generate this batch item */
  system_prompt_template_id: z.number().int().nullable().optional(),
  system_prompt_used: z.string().optional(),
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

/** Padajala puzzle-image batch metadata — uses a dedicated type discriminator. */
export const padajala_image_batch_metadata_schema = image_batch_metadata_base.extend({
  type: z.literal('padajala-puzzle-image'),
  game: z.literal('padajala').default('padajala')
});

/** @deprecated Prefer padavali_image_batch_metadata_schema; kept as alias for existing imports. */
export const image_batch_metadata_schema = padavali_image_batch_metadata_schema;

/** Dvayī / Bhramitā / Surūpa / Ānveṣī share one discriminator; `game` says which. */
export const simple_game_image_batch_metadata_schema = image_batch_metadata_base.extend({
  type: z.literal('krida-puzzle-image'),
  game: z.enum(SIMPLE_GAME_KINDS)
});

export const batch_metadata_schema = z.discriminatedUnion('type', [
  padavali_image_batch_metadata_schema,
  padajala_image_batch_metadata_schema,
  simple_game_image_batch_metadata_schema
]);
export type BatchMetadata = z.infer<typeof batch_metadata_schema>;

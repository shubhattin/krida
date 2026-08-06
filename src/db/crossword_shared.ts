import { z } from 'zod';
import {
  CrossWordPuzzleWordSchema,
  CrossordPuzzleGridCellSchema,
  CrossordPuzzleSchemaZod
} from '~/db/schema_zod';
import {
  CROSSWORD_DEFAULT_DIM,
  CROSSWORD_MAX_DIM,
  CROSSWORD_MIN_DIM
} from '~/util/cross_word/grid';
import { attachment_schema } from '~/db/db_shared_vals';
import { crossword_slug_schema } from '~/util/puzzle/slug';
import { location_list_enum } from '~/db/types';

export const crossword_dimensions_schema = z.tuple([
  z.number().int().min(CROSSWORD_MIN_DIM).max(CROSSWORD_MAX_DIM),
  z.number().int().min(CROSSWORD_MIN_DIM).max(CROSSWORD_MAX_DIM)
]);

export const crossword_add_input_schema = z.object({
  title: z.string().min(1),
  slug: crossword_slug_schema,
  description: z.string().default(''),
  grid_dimensions: crossword_dimensions_schema.default(CROSSWORD_DEFAULT_DIM),
  override_redirect_slug: z.boolean().default(false)
});

export const crossword_update_input_schema = z.object({
  puzzle_id: z.number().int(),
  puzzle_slug: crossword_slug_schema,
  image_id: z.number().int().nullable(),
  puzzle_data: z
    .object({
      title: z.string().min(1),
      description: z.string().trim().min(1, 'Description is required'),
      listed: z.boolean(),
      grid_dimensions: crossword_dimensions_schema,
      grid_data: CrossordPuzzleGridCellSchema.array().array(),
      word_list: CrossWordPuzzleWordSchema.array(),
      attachments: attachment_schema
        .omit({ id: true })
        .extend({
          id: z.number().int().nullable()
        })
        .array()
    })
    .refine(
      (data) =>
        data.grid_data.length === data.grid_dimensions[0] &&
        data.grid_data.every((row) => row.length === data.grid_dimensions[1]),
      {
        message: 'grid_data dimensions must match grid_dimensions',
        path: ['grid_data']
      }
    )
});

export const crossword_update_slug_input_schema = z.object({
  puzzle_id: z.number().int(),
  current_slug: crossword_slug_schema,
  new_slug: crossword_slug_schema,
  override_redirect_slug: z.boolean().default(false)
});

export const crossword_submit_stats_input_schema = z.object({
  turnstile_token: z.string(),
  info: z
    .object({
      puzzle_id: z.number().int().positive(),
      time_taken: z.number().int().nonnegative(),
      accuracy: z.number().int().min(0).max(100),
      total_entries: z.number().int().nonnegative(),
      total_cells: z.number().int().nonnegative(),
      prefilled_cells: z.number().int().nonnegative(),
      letter_inputs: z.number().int().nonnegative(),
      incorrect_entry_attempts: z.number().int().nonnegative(),
      session_id: z.number().int().positive()
    })
    .refine((data) => data.prefilled_cells <= data.total_cells, {
      message: 'prefilled_cells must be <= total_cells',
      path: ['prefilled_cells']
    })
    .refine((data) => data.total_entries <= data.total_cells, {
      message: 'total_entries must be <= total_cells',
      path: ['total_entries']
    })
});

export const crossword_update_games_started_input_schema = z.object({
  turnstile_token: z.string(),
  id: z.number().int(),
  location: location_list_enum,
  /** Stable per browser play attempt — dedupes spammy start calls. */
  client_play_id: z.string().uuid()
});

export const crossword_list_input_schema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(50).default(12),
  search_title: z.string().optional(),
  listed_filter: z.boolean().optional(),
  sort_by: z.enum(['created_at', 'updated_at']).default('created_at'),
  order_by: z.enum(['asc', 'desc']).default('desc')
});

export type CrosswordAddInput = z.infer<typeof crossword_add_input_schema>;
export type CrosswordUpdateInput = z.infer<typeof crossword_update_input_schema>;

/** Public card summary — minimize serialized fields */
export const crossword_public_card_schema = CrossordPuzzleSchemaZod.pick({
  id: true,
  title: true,
  description: true,
  grid_dimensions: true,
  listed: true,
  created_at: true
});

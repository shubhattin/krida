import { catalog_list_filter_fields } from '~/util/catalog/tags';
import { z } from 'zod';
import {
  PadajalaPuzzleWordSchema,
  CrossordPuzzleGridCellSchema,
  CrossordPuzzleSchemaZod
} from '~/db/schema_zod';
import { PADAJALA_DEFAULT_DIM, PADAJALA_MAX_DIM, PADAJALA_MIN_DIM } from '~/util/padajala/grid';
import { attachment_schema } from '~/db/db_shared_vals';
import { padajala_slug_schema } from '~/util/puzzle/slug';
import { location_list_enum } from '~/db/types';

export const padajala_dimensions_schema = z.tuple([
  z.number().int().min(PADAJALA_MIN_DIM).max(PADAJALA_MAX_DIM),
  z.number().int().min(PADAJALA_MIN_DIM).max(PADAJALA_MAX_DIM)
]);

export const padajala_add_input_schema = z.object({
  title: z.string().min(1),
  slug: padajala_slug_schema,
  description: z.string().default(''),
  grid_dimensions: padajala_dimensions_schema.default(PADAJALA_DEFAULT_DIM),
  override_redirect_slug: z.boolean().default(false)
});

export const padajala_update_input_schema = z.object({
  puzzle_id: z.number().int(),
  puzzle_slug: padajala_slug_schema,
  image_id: z.number().int().nullable(),
  puzzle_data: z
    .object({
      title: z.string().min(1),
      description: z.string().trim().min(1, 'Description is required'),
      listed: z.boolean(),
      grid_dimensions: padajala_dimensions_schema,
      grid_data: CrossordPuzzleGridCellSchema.array().array(),
      word_list: PadajalaPuzzleWordSchema.array(),
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

export const padajala_update_slug_input_schema = z.object({
  puzzle_id: z.number().int(),
  current_slug: padajala_slug_schema,
  new_slug: padajala_slug_schema,
  override_redirect_slug: z.boolean().default(false)
});

export const padajala_submit_stats_input_schema = z.object({
  turnstile_token: z.string().min(1).nullable().optional(),
  /** Play id sent to `update_games_started`; proves the caller started an anonymous session. */
  client_play_id: z.string().uuid().optional(),
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

export const padajala_update_games_started_input_schema = z.object({
  turnstile_token: z.string().min(1).nullable().optional(),
  id: z.number().int(),
  location: location_list_enum,
  /** Stable per browser play attempt — dedupes spammy start calls. */
  client_play_id: z.string().uuid()
});

export const padajala_list_input_schema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(50).default(12),
  search_title: z.string().optional(),
  listed_filter: z.boolean().optional(),
  sort_by: z.enum(['created_at', 'updated_at']).default('created_at'),
  order_by: z.enum(['asc', 'desc']).default('desc'),
  ...catalog_list_filter_fields
});

export type PadajalaAddInput = z.infer<typeof padajala_add_input_schema>;
export type PadajalaUpdateInput = z.infer<typeof padajala_update_input_schema>;

/** Public card summary — minimize serialized fields */
export const padajala_public_card_schema = CrossordPuzzleSchemaZod.pick({
  id: true,
  grid_dimensions: true
}).extend({
  title: z.string(),
  description: z.string(),
  listed: z.boolean(),
  created_at: z.coerce.date()
});

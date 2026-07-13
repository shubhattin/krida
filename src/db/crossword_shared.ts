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

export const crossword_dimensions_schema = z.tuple([
  z.number().int().min(CROSSWORD_MIN_DIM).max(CROSSWORD_MAX_DIM),
  z.number().int().min(CROSSWORD_MIN_DIM).max(CROSSWORD_MAX_DIM)
]);

export const crossword_add_input_schema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  grid_dimensions: crossword_dimensions_schema.default(CROSSWORD_DEFAULT_DIM)
});

export const crossword_update_input_schema = z.object({
  puzzle_id: z.number().int(),
  puzzle_data: z.object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    listed: z.boolean(),
    grid_dimensions: crossword_dimensions_schema,
    grid_data: CrossordPuzzleGridCellSchema.array().array(),
    word_list: CrossWordPuzzleWordSchema.array()
  })
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

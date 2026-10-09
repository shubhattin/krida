import { z } from 'zod';
import { attachment_schema } from '~/db/db_shared_vals';
import { location_list_enum } from '~/db/types';
import { script_list_enum } from '~/state/script_list';
import { simple_game_slug_schema } from '~/util/puzzle/slug';

export const simple_game_add_input_schema = z.object({
  title: z.string().min(1),
  slug: simple_game_slug_schema,
  description: z.string().default(''),
  override_redirect_slug: z.boolean().default(false)
});

export const simple_game_list_input_schema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(50).default(12),
  search_title: z.string().optional(),
  listed_filter: z.boolean().optional(),
  sort_by: z.enum(['created_at', 'updated_at']).default('created_at'),
  order_by: z.enum(['asc', 'desc']).default('desc'),
  tag_slug: z.string().min(1).max(80).optional(),
  collection_id: z.number().int().optional()
});

export const simple_game_update_slug_input_schema = z.object({
  puzzle_id: z.number().int(),
  current_slug: simple_game_slug_schema,
  new_slug: simple_game_slug_schema,
  override_redirect_slug: z.boolean().default(false)
});

export const simple_game_attachment_input_schema = attachment_schema
  .omit({ id: true })
  .extend({
    id: z.number().int().nullable()
  });

export const simple_game_submit_stats_input_schema = z.object({
  turnstile_token: z.string().min(1).nullable().optional(),
  info: z.object({
    puzzle_id: z.number().int().positive(),
    time_taken: z.number().int().nonnegative(),
    accuracy: z.number().int().min(0).max(100),
    correct_attempts: z.number().int().nonnegative(),
    total_attempts: z.number().int().nonnegative(),
    session_id: z.number().int().positive()
  })
});

export const simple_game_update_games_started_input_schema = z.object({
  turnstile_token: z.string().min(1).nullable().optional(),
  id: z.number().int(),
  location: location_list_enum,
  script: script_list_enum.optional(),
  client_play_id: z.string().uuid()
});

export function simpleGameUpdateInputSchema<T extends z.ZodType>(puzzleDataSchema: T) {
  return z.object({
    puzzle_id: z.number().int(),
    puzzle_slug: simple_game_slug_schema,
    puzzle_data: z.object({
      title: z.string().min(1),
      description: z.string().trim().min(1, 'Description is required'),
      listed: z.boolean(),
      game_data: puzzleDataSchema,
      attachments: simple_game_attachment_input_schema.array()
    })
  });
}

export type SimpleGameAddInput = z.infer<typeof simple_game_add_input_schema>;
export type SimpleGameAttachmentInput = z.infer<typeof simple_game_attachment_input_schema>;

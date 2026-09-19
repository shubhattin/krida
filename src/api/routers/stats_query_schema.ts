import { z } from 'zod';

const refineDateRange = (
  data: {
    all_time: boolean;
    start_date?: Date;
    end_date?: Date;
  },
  ctx: z.RefinementCtx
) => {
  if (!data.all_time && (!data.start_date || !data.end_date)) {
    ctx.addIssue({
      code: 'custom',
      message: 'start_date and end_date are required when all_time is false',
      path: ['start_date']
    });
  }
  if (!data.all_time && data.start_date && data.end_date && data.start_date > data.end_date) {
    ctx.addIssue({
      code: 'custom',
      message: 'start_date must be before end_date',
      path: ['end_date']
    });
  }
};

export const get_stats_data_input_schema = z
  .object({
    puzzle_ids: z.array(z.number().int()).optional(),
    user_ids: z.array(z.string().min(1)).optional(),
    all_time: z.boolean(),
    start_date: z.date().optional(),
    end_date: z.date().optional()
  })
  .superRefine(refineDateRange);

export const get_top_puzzles_input_schema = z
  .object({
    all_time: z.boolean(),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
    limit: z.number().int().min(1).max(50).default(10)
  })
  .superRefine(refineDateRange);

export const get_top_users_input_schema = z
  .object({
    all_time: z.boolean(),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
    limit: z.number().int().min(1).max(50).default(10),
    puzzle_ids: z.array(z.number().int()).optional()
  })
  .superRefine(refineDateRange);

export const get_user_list_input_schema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(50).default(8),
  search: z.string().max(200).optional()
});

export const dashboard_game_filter_schema = z.enum(['all', 'padavali', 'padajala']);

export const get_user_dashboard_input_schema = z.object({
  game: dashboard_game_filter_schema.default('all')
});

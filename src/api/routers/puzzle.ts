import { z } from 'zod';
import { protectedAdminProcedure, t } from '../trpc_init';
import { db } from '~/db/db';
import { word_puzzles } from '~/db/schema';
import { eq } from 'drizzle-orm';

const update_puzzle_route = protectedAdminProcedure
  .input(
    z.object({
      id: z.number().int(),
      uuid: z.string().uuid(),
      title: z.string(),
      created_at: z.coerce.date(),
      updated_at: z.coerce.date().nullable(),
      word_list: z.string().min(2).array(),
      grid_data: z.string().min(1).array().array(),
      grid_dimensions: z.tuple([z.number().int(), z.number().int()])
    })
  )
  .mutation(async ({ ctx, input }) => {
    await db.update(word_puzzles).set(input).where(eq(word_puzzles.id, input.id));
    return {
      success: true
    };
  });

export const puzzle_router = t.router({
  update_puzzle: update_puzzle_route
});

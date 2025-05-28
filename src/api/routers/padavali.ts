import { z } from 'zod';
import { protectedAdminProcedure, t } from '../trpc_init';
import { db } from '~/db/db';
import { word_puzzles } from '~/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const schema = z.object({
  id: z.number().int(),
  uuid: z.string().uuid(),
  title: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable(),
  word_list: z.string().min(2).array(),
  grid_data: z.string().min(1).array().array(),
  grid_dimensions: z.tuple([z.number().int(), z.number().int()])
});

const update_puzzle_route = protectedAdminProcedure.input(schema).mutation(async ({ input }) => {
  await db
    .update(word_puzzles)
    .set(input)
    .where(and(eq(word_puzzles.id, input.id), eq(word_puzzles.uuid, input.uuid)));
  revalidatePath('/padavali/list');
  return {
    success: true
  };
});

const add_puzzle_route = protectedAdminProcedure
  .input(
    schema.omit({
      id: true,
      uuid: true,
      created_at: true,
      updated_at: true
    })
  )
  .mutation(async ({ input }) => {
    const info = await db.insert(word_puzzles).values(input).returning();
    revalidatePath('/padavali/list');
    return {
      id: info[0].id,
      uuid: info[0].uuid
    };
  });

const delete_puzzle_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int() }))
  .mutation(async ({ input }) => {
    await db.delete(word_puzzles).where(eq(word_puzzles.id, input.id));
    revalidatePath('/padavali/list');
    return {
      success: true
    };
  });

export const padavali_router = t.router({
  update_puzzle: update_puzzle_route,
  add_puzzle: add_puzzle_route,
  delete_puzzle: delete_puzzle_route
});

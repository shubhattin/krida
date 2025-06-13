import { TRPCError } from '@trpc/server';
import { publicProcedure, t, verify_cloudflare_turnstile_token } from '../trpc_init';
import { z } from 'zod';
import { puzzle_gameplay_stats, word_puzzles } from '~/db/schema';
import { db } from '~/db/db';
import { and, eq, sql } from 'drizzle-orm';

const submit_stats_route = publicProcedure
  .input(
    z.object({
      turnstile_token: z.string(),
      info: z.object({
        puzzle_id: z.number().int(),
        time_taken: z.number().int(),
        accuracy: z.number().int(),
        correct_attempts: z.number().int(),
        total_attempts: z.number().int()
      })
    })
  )
  .mutation(async ({ input }) => {
    const { turnstile_token, info } = input;
    const is_valid = await verify_cloudflare_turnstile_token(turnstile_token);
    if (!is_valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid turnstile token' });
    }
    const { puzzle_id, time_taken, accuracy, correct_attempts, total_attempts } = info;
    await db.insert(puzzle_gameplay_stats).values({
      puzzle_id,
      time_taken,
      accuracy,
      correct_attempts,
      total_attempts
    });

    return {
      submitted: true
    };
  });

const update_games_started_route = publicProcedure
  .input(z.object({ turnstile_token: z.string(), id: z.number().int(), uuid: z.string().uuid() }))
  .mutation(async ({ input: { turnstile_token, id, uuid } }) => {
    const is_valid = await verify_cloudflare_turnstile_token(turnstile_token);
    if (!is_valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid turnstile token' });
    }

    await db
      .update(word_puzzles)
      .set({ games_started: sql`${word_puzzles.games_started} + 1` })
      .where(and(eq(word_puzzles.id, id), eq(word_puzzles.uuid, uuid)));
    return { success: true };
  });

export const padavali_stats_router = t.router({
  submit_stats: submit_stats_route,
  update_games_started: update_games_started_route
});

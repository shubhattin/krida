import { TRPCError } from '@trpc/server';
import { publicProcedure, t, verify_cloudflare_turnstile_token } from '../trpc_init';
import { z } from 'zod';
import { puzzle_gameplay_sessions, puzzle_gameplay_stats } from '~/db/schema';
import { db } from '~/db/db';

const submit_stats_route = publicProcedure
  .input(
    z.object({
      turnstile_token: z.string(),
      info: z.object({
        puzzle_id: z.number().int(),
        time_taken: z.number().int(),
        accuracy: z.number().int(),
        correct_attempts: z.number().int(),
        total_attempts: z.number().int(),
        session_id: z.number().int()
      })
    })
  )
  .mutation(async ({ input }) => {
    const { turnstile_token, info } = input;
    const is_valid = await verify_cloudflare_turnstile_token(turnstile_token);
    if (!is_valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid turnstile token' });
    }
    const { puzzle_id, time_taken, accuracy, correct_attempts, total_attempts, session_id } = info;
    await db.insert(puzzle_gameplay_stats).values({
      puzzle_id,
      session_id,
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
  .input(z.object({ turnstile_token: z.string(), id: z.number().int(), location: z.string() }))
  .mutation(async ({ input: { turnstile_token, id, location } }) => {
    const is_valid = await verify_cloudflare_turnstile_token(turnstile_token);
    if (!is_valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid turnstile token' });
    }

    const [{ id: session_id }] = await db
      .insert(puzzle_gameplay_sessions)
      .values({
        puzzle_id: id,
        location
      })
      .returning();

    return { success: true, session_id: session_id };
  });

export const padavali_stats_router = t.router({
  submit_stats: submit_stats_route,
  update_games_started: update_games_started_route
});

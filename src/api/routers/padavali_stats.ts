import { TRPCError } from '@trpc/server';
import { publicProcedure, t, verify_cloudflare_turnstile_token } from '../trpc_init';
import { z } from 'zod';
import { puzzle_gameplay_stats } from '~/db/schema';
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

export const padavali_stats_router = t.router({
  submit_stats: submit_stats_route
});

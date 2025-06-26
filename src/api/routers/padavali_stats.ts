import { TRPCError } from '@trpc/server';
import {
  protectedAdminProcedure,
  publicProcedure,
  t,
  verify_cloudflare_turnstile_token
} from '../trpc_init';
import { z } from 'zod';
import { puzzle_gameplay_sessions, puzzle_gameplay_stats } from '~/db/schema';
import { db } from '~/db/db';
import { location_list_enum } from '~/db/types';
import { script_list_enum } from '~/state/script_list';

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
  .input(
    z.object({
      turnstile_token: z.string(),
      id: z.number().int(),
      location: location_list_enum,
      script: script_list_enum
    })
  )
  .mutation(async ({ input: { turnstile_token, id, location, script } }) => {
    const is_valid = await verify_cloudflare_turnstile_token(turnstile_token);
    if (!is_valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid turnstile token' });
    }

    const [{ id: session_id }] = await db
      .insert(puzzle_gameplay_sessions)
      .values({
        puzzle_id: id,
        location,
        script
      })
      .returning();

    return { success: true, session_id: session_id };
  });

const get_stats_data_route = protectedAdminProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      start_date: z.date(),
      end_date: z.date()
    })
  )
  .query(async ({ input: { puzzle_id, start_date, end_date } }) => {
    const sessions = await db.query.puzzle_gameplay_sessions.findMany({
      columns: {
        id: true,
        created_at: true,
        location: true,
        script: true
      },
      where: (tbl, { and, eq, gte, lte }) =>
        and(
          eq(tbl.puzzle_id, puzzle_id),
          gte(tbl.created_at, start_date),
          lte(tbl.created_at, end_date)
        )
    });
    const stats = await db.query.puzzle_gameplay_stats.findMany({
      columns: {
        id: true,
        created_at: true,
        session_id: true,
        time_taken: true,
        accuracy: true,
        correct_attempts: true,
        total_attempts: true
      },
      where: (tbl, { and, eq, gte, lte }) =>
        and(
          eq(tbl.puzzle_id, puzzle_id),
          gte(tbl.created_at, start_date),
          lte(tbl.created_at, end_date)
        )
    });
    const total_words = (await db.query.word_puzzles.findFirst({
      columns: {
        word_list: true
      },
      where: (tbl, { eq }) => eq(tbl.id, puzzle_id)
    }))!.word_list.length;
    return { sessions, stats, correct_attempts: total_words };
  });

export const padavali_stats_router = t.router({
  submit_stats: submit_stats_route,
  update_games_started: update_games_started_route,
  get_stats_data: get_stats_data_route
});

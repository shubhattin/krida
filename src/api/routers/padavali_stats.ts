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

const get_stats_data_input_schema = z
  .object({
    puzzle_ids: z.array(z.number().int()).optional(),
    all_time: z.boolean(),
    start_date: z.date().optional(),
    end_date: z.date().optional()
  })
  .superRefine((data, ctx) => {
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
  });

const get_stats_data_route = protectedAdminProcedure
  .input(get_stats_data_input_schema)
  .query(async ({ input: { puzzle_ids, all_time, start_date, end_date } }) => {
    const sessions = await db.query.puzzle_gameplay_sessions.findMany({
      columns: {
        id: true,
        created_at: true,
        location: true,
        script: true
      },
      where: (tbl, { and: andFn, gte: gteFn, lte: lteFn, inArray: inArrayFn }) => {
        const conditions = [];
        if (puzzle_ids && puzzle_ids.length > 0) {
          conditions.push(inArrayFn(tbl.puzzle_id, puzzle_ids));
        }
        if (!all_time && start_date && end_date) {
          conditions.push(gteFn(tbl.created_at, start_date));
          conditions.push(lteFn(tbl.created_at, end_date));
        }
        return conditions.length > 0 ? andFn(...conditions) : undefined;
      }
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
      where: (tbl, { and: andFn, gte: gteFn, lte: lteFn, inArray: inArrayFn }) => {
        const conditions = [];
        if (puzzle_ids && puzzle_ids.length > 0) {
          conditions.push(inArrayFn(tbl.puzzle_id, puzzle_ids));
        }
        if (!all_time && start_date && end_date) {
          conditions.push(gteFn(tbl.created_at, start_date));
          conditions.push(lteFn(tbl.created_at, end_date));
        }
        return conditions.length > 0 ? andFn(...conditions) : undefined;
      }
    });

    let total_words = 0;
    const puzzles = await db.query.word_puzzles.findMany({
      columns: { word_list: true },
      where:
        puzzle_ids && puzzle_ids.length > 0
          ? (tbl, { inArray: inArrayFn }) => inArrayFn(tbl.id, puzzle_ids)
          : undefined
    });
    total_words = puzzles.reduce((sum, puzzle) => sum + puzzle.word_list.length, 0);

    return { sessions, stats, correct_attempts: total_words };
  });

export const padavali_stats_router = t.router({
  submit_stats: submit_stats_route,
  update_games_started: update_games_started_route,
  get_stats_data: get_stats_data_route
});

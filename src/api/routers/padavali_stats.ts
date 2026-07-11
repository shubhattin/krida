import { TRPCError } from '@trpc/server';
import {
  protectedAdminProcedure,
  publicProcedure,
  t,
  verify_cloudflare_turnstile_token
} from '../trpc_init';
import { z } from 'zod';
import { puzzle_gameplay_sessions, puzzle_gameplay_stats, word_puzzles } from '~/db/schema';
import { db } from '~/db/db';
import { location_list_enum } from '~/db/types';
import { script_list_enum } from '~/state/script_list';
import { and, count, desc, eq, gte, inArray, lte } from 'drizzle-orm';

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
        session_id: z.number().int(),
        practice_mode: z.boolean().default(false)
      })
    })
  )
  .mutation(async ({ input }) => {
    const { turnstile_token, info } = input;
    const is_valid = await verify_cloudflare_turnstile_token(turnstile_token);
    if (!is_valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid turnstile token' });
    }
    const {
      puzzle_id,
      time_taken,
      accuracy,
      correct_attempts,
      total_attempts,
      session_id,
      practice_mode
    } = info;

    if (practice_mode) {
      await db
        .update(puzzle_gameplay_sessions)
        .set({ practice_mode: true })
        .where(eq(puzzle_gameplay_sessions.id, session_id));
    }

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
      script: script_list_enum,
      practice_mode: z.boolean().default(false)
    })
  )
  .mutation(async ({ input: { turnstile_token, id, location, script, practice_mode } }) => {
    const is_valid = await verify_cloudflare_turnstile_token(turnstile_token);
    if (!is_valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid turnstile token' });
    }

    const [{ id: session_id }] = await db
      .insert(puzzle_gameplay_sessions)
      .values({
        puzzle_id: id,
        location,
        script,
        practice_mode
      })
      .returning();

    return { success: true, session_id: session_id };
  });

const update_session_practice_mode_route = publicProcedure
  .input(
    z.object({
      turnstile_token: z.string(),
      session_id: z.number().int(),
      practice_mode: z.boolean()
    })
  )
  .mutation(async ({ input: { turnstile_token, session_id, practice_mode } }) => {
    const is_valid = await verify_cloudflare_turnstile_token(turnstile_token);
    if (!is_valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid turnstile token' });
    }

    await db
      .update(puzzle_gameplay_sessions)
      .set({ practice_mode })
      .where(eq(puzzle_gameplay_sessions.id, session_id));

    return { success: true };
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
        practice_mode: true,
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

const get_top_puzzles_input_schema = z
  .object({
    all_time: z.boolean(),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
    limit: z.number().int().min(1).max(50).default(10)
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

/** Top puzzles by plays — totals both practice and no-hint sessions. */
const get_top_puzzles_route = protectedAdminProcedure
  .input(get_top_puzzles_input_schema)
  .query(async ({ input: { all_time, start_date, end_date, limit } }) => {
    const dateConditions =
      !all_time && start_date && end_date
        ? [
            gte(puzzle_gameplay_sessions.created_at, start_date),
            lte(puzzle_gameplay_sessions.created_at, end_date)
          ]
        : [];

    const topSessions = await db
      .select({
        puzzle_id: puzzle_gameplay_sessions.puzzle_id,
        title: word_puzzles.title,
        started: count()
      })
      .from(puzzle_gameplay_sessions)
      .innerJoin(word_puzzles, eq(word_puzzles.id, puzzle_gameplay_sessions.puzzle_id))
      .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
      .groupBy(puzzle_gameplay_sessions.puzzle_id, word_puzzles.title)
      .orderBy(desc(count()))
      .limit(limit);

    if (topSessions.length === 0) {
      return {
        puzzles: [] as { puzzle_id: number; title: string; started: number; completed: number }[]
      };
    }

    const puzzleIds = topSessions.map((row) => row.puzzle_id);
    const statsDateConditions =
      !all_time && start_date && end_date
        ? [
            gte(puzzle_gameplay_stats.created_at, start_date),
            lte(puzzle_gameplay_stats.created_at, end_date)
          ]
        : [];

    const completionRows = await db
      .select({
        puzzle_id: puzzle_gameplay_stats.puzzle_id,
        completed: count()
      })
      .from(puzzle_gameplay_stats)
      .where(
        and(
          inArray(puzzle_gameplay_stats.puzzle_id, puzzleIds),
          ...(statsDateConditions.length > 0 ? statsDateConditions : [])
        )
      )
      .groupBy(puzzle_gameplay_stats.puzzle_id);

    const completedByPuzzle = new Map(
      completionRows.map((row) => [row.puzzle_id, Number(row.completed)])
    );

    return {
      puzzles: topSessions.map((row) => ({
        puzzle_id: row.puzzle_id,
        title: row.title,
        started: Number(row.started),
        completed: completedByPuzzle.get(row.puzzle_id) ?? 0
      }))
    };
  });

export const padavali_stats_router = t.router({
  submit_stats: submit_stats_route,
  update_games_started: update_games_started_route,
  update_session_practice_mode: update_session_practice_mode_route,
  get_stats_data: get_stats_data_route,
  get_top_puzzles: get_top_puzzles_route
});

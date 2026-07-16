import { z } from 'zod';
import { protectedAdminProcedure, publicProcedure, t } from '../trpc_init';
import { db } from '~/db/db';
import { crossword_puzzles } from '~/db/schema';
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';
import { createEmptyGridData } from '~/util/cross_word/grid';
import { analyzeWordPlacements, resolveWordListForSave } from '~/util/cross_word/placement';
import {
  crossword_add_input_schema,
  crossword_list_input_schema,
  crossword_update_input_schema
} from '~/db/crossword_shared';
import { CrossordPuzzleSchemaZod } from '~/db/schema_zod';

const revalidateCrosswordPaths = () => {
  revalidatePath('/crossword');
  revalidatePath('/crossword/list');
};

const get_listed_puzzles_route = publicProcedure.query(async () => {
  const rows = await db
    .select({
      id: crossword_puzzles.id,
      title: crossword_puzzles.title,
      description: crossword_puzzles.description,
      grid_dimensions: crossword_puzzles.grid_dimensions,
      grid_data: crossword_puzzles.grid_data,
      word_list: crossword_puzzles.word_list,
      listed: crossword_puzzles.listed,
      last_listed_at: crossword_puzzles.last_listed_at,
      created_at: crossword_puzzles.created_at,
      updated_at: crossword_puzzles.updated_at,
      slug: crossword_puzzles.slug
    })
    .from(crossword_puzzles)
    .where(eq(crossword_puzzles.listed, true))
    .orderBy(desc(crossword_puzzles.last_listed_at), desc(crossword_puzzles.created_at));

  return rows.map((row) => CrossordPuzzleSchemaZod.parse(row));
});

const get_puzzle_by_id_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int() }))
  .query(async ({ input: { id } }) => {
    const row = await db.query.crossword_puzzles.findFirst({
      where: (tbl, { eq: eqFn }) => eqFn(tbl.id, id)
    });
    if (!row) return null;
    return CrossordPuzzleSchemaZod.parse(row);
  });

const get_puzzle_list_page_route = protectedAdminProcedure
  .input(crossword_list_input_schema)
  .query(async ({ input }) => {
    const { page, size, search_title, listed_filter, sort_by, order_by } =
      crossword_list_input_schema.parse(input);

    const trimmedSearch = search_title?.trim();
    const conditions = [];
    if (typeof listed_filter === 'boolean') {
      conditions.push(eq(crossword_puzzles.listed, listed_filter));
    }
    if (trimmedSearch) {
      for (const token of tokenizeSearchQuery(trimmedSearch)) {
        const pattern = `%${escapeIlikeToken(token)}%`;
        conditions.push(
          or(ilike(crossword_puzzles.title, pattern), ilike(crossword_puzzles.description, pattern))!
        );
      }
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sortCol =
      sort_by === 'updated_at'
        ? sql`coalesce(${crossword_puzzles.updated_at}, ${crossword_puzzles.created_at})`
        : crossword_puzzles.created_at;
    const orderPrimary = order_by === 'desc' ? desc(sortCol) : asc(sortCol);
    const orderTiebreaker =
      order_by === 'desc' ? desc(crossword_puzzles.id) : asc(crossword_puzzles.id);
    const offset = (page - 1) * size;

    const [countResult, rows] = await Promise.all([
      db.select({ count: count() }).from(crossword_puzzles).where(whereClause),
      db
        .select({
          id: crossword_puzzles.id,
          title: crossword_puzzles.title,
          description: crossword_puzzles.description,
          listed: crossword_puzzles.listed,
          grid_dimensions: crossword_puzzles.grid_dimensions,
          created_at: crossword_puzzles.created_at,
          updated_at: crossword_puzzles.updated_at
        })
        .from(crossword_puzzles)
        .where(whereClause)
        .orderBy(orderPrimary, orderTiebreaker)
        .limit(size)
        .offset(offset)
    ]);

    const total = countResult[0]?.count ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / size));

    return {
      list: rows,
      total,
      page,
      pageCount,
      hasPrev: page > 1,
      hasNext: page < pageCount
    };
  });

const add_puzzle_route = protectedAdminProcedure
  .input(crossword_add_input_schema)
  .mutation(async ({ input }) => {
    const dimensions = input.grid_dimensions;
    const [inserted] = await db
      .insert(crossword_puzzles)
      .values({
        title: input.title.trim(),
        description: input.description?.trim() ? input.description.trim() : null,
        grid_dimensions: dimensions,
        grid_data: createEmptyGridData(dimensions),
        word_list: [],
        listed: false
      })
      .returning();

    revalidateCrosswordPaths();
    return { id: inserted!.id };
  });

const update_puzzle_route = protectedAdminProcedure
  .input(crossword_update_input_schema)
  .mutation(async ({ input: { puzzle_id, puzzle_data } }) => {
    const existing = await db.query.crossword_puzzles.findFirst({
      columns: { id: true, listed: true },
      where: (tbl, { eq: eqFn }) => eqFn(tbl.id, puzzle_id)
    });
    if (!existing) {
      throw new Error('Puzzle not found');
    }

    const resolvedWordList = resolveWordListForSave(puzzle_data.grid_data, puzzle_data.word_list);
    const analysis = analyzeWordPlacements(puzzle_data.grid_data, puzzle_data.word_list);

    if (puzzle_data.listed && !analysis.canList) {
      throw new Error(
        'Cannot list puzzle until every word has exactly one valid placement on the grid'
      );
    }

    const becomingListed = puzzle_data.listed && !existing.listed;

    await db
      .update(crossword_puzzles)
      .set({
        title: puzzle_data.title.trim(),
        description: puzzle_data.description?.trim() ? puzzle_data.description.trim() : null,
        listed: puzzle_data.listed,
        grid_dimensions: puzzle_data.grid_dimensions,
        grid_data: puzzle_data.grid_data,
        word_list: resolvedWordList,
        ...(becomingListed ? { last_listed_at: new Date() } : {})
      })
      .where(eq(crossword_puzzles.id, puzzle_id));

    revalidateCrosswordPaths();
    revalidatePath(`/crossword/edit/${puzzle_id}`);
    return { success: true as const };
  });

const set_listed_route = protectedAdminProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      listed: z.boolean()
    })
  )
  .mutation(async ({ input: { puzzle_id, listed } }) => {
    const existing = await db.query.crossword_puzzles.findFirst({
      where: (tbl, { eq: eqFn }) => eqFn(tbl.id, puzzle_id)
    });
    if (!existing) {
      throw new Error('Puzzle not found');
    }

    if (listed) {
      const analysis = analyzeWordPlacements(existing.grid_data, existing.word_list);
      if (!analysis.canList) {
        throw new Error(
          'Cannot list puzzle until every word has exactly one valid placement on the grid'
        );
      }
    }

    const becomingListed = listed && !existing.listed;

    await db
      .update(crossword_puzzles)
      .set({
        listed,
        ...(becomingListed ? { last_listed_at: new Date() } : {})
      })
      .where(eq(crossword_puzzles.id, puzzle_id));

    revalidateCrosswordPaths();
    return { success: true as const };
  });

const delete_puzzle_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int() }))
  .mutation(async ({ input: { id } }) => {
    const existing = await db.query.crossword_puzzles.findFirst({
      columns: { id: true },
      where: (tbl, { eq: eqFn }) => eqFn(tbl.id, id)
    });
    if (!existing) {
      throw new Error('Puzzle not found');
    }

    await db.delete(crossword_puzzles).where(eq(crossword_puzzles.id, id));

    revalidateCrosswordPaths();
    revalidatePath(`/crossword/edit/${id}`);
    return { success: true as const };
  });

export const crossword_router = t.router({
  get_listed_puzzles: get_listed_puzzles_route,
  get_puzzle_by_id: get_puzzle_by_id_route,
  get_puzzle_list_page: get_puzzle_list_page_route,
  add_puzzle: add_puzzle_route,
  update_puzzle: update_puzzle_route,
  set_listed: set_listed_route,
  delete_puzzle: delete_puzzle_route
});

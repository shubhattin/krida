import { z } from 'zod';
import { protectedAdminProcedure, publicProcedure, t } from '../../trpc_init';
import { db, type transactionType } from '~/db/db';
import {
  crossword_attachments,
  crossword_puzzles,
  crossword_redirects,
  image_assets
} from '~/db/schema';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';
import { createEmptyGridData } from '~/util/cross_word/grid';
import { analyzeWordPlacements, resolveWordListForSave } from '~/util/cross_word/placement';
import {
  crossword_add_input_schema,
  crossword_list_input_schema,
  crossword_update_input_schema,
  crossword_update_slug_input_schema
} from '~/db/crossword_shared';
import { crossword_slug_schema } from '~/util/puzzle/slug';
import { CrossordPuzzleSchemaZod } from '~/db/schema_zod';
import {
  CACHE,
  invalidate_and_refresh_cached,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { normalizeSlug } from '~/util/puzzle/slug';
import type { crossword_update_input_schema as CrosswordUpdateInputSchema } from '~/db/crossword_shared';
import {
  assert_slug_usable_for_mutation,
  delete_redirect_for_slug,
  resolve_slug_availability,
  upsert_redirect_for_puzzle
} from './slug_helpers';
import { crossword_stats_router } from './crossword_stats';
import { crossword_schedules_router } from './crossword_schedules';

type AttachmentInput = z.infer<typeof CrosswordUpdateInputSchema>['puzzle_data']['attachments'];

const revalidateCrosswordPaths = (slug?: string) => {
  revalidatePath('/padajala');
  revalidatePath('/padajala/puzzles');
  revalidatePath('/padajala/list');
  if (slug) {
    revalidatePath(`/padajala/${slug}`);
  }
};

const puzzle_in_current_schedule = async (id: number) => {
  const current_schedule = await CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS);
  return current_schedule?.puzzle.id === id;
};

const puzzle_in_next_schedule = async (id: number) => {
  const next_schedule = await CACHE.crossword.next_schedule.get(NO_CACHE_PARAMS);
  return next_schedule?.puzzle.id === id;
};

const update_puzzle_attachments = async (
  tx: transactionType,
  puzzle_id: number,
  attachments: AttachmentInput
) => {
  const current_attachments = await tx.query.crossword_attachments.findMany({
    where: (tbl, { eq: eqFn }) => eqFn(tbl.puzzle_id, puzzle_id),
    columns: { id: true }
  });
  const new_attachments = attachments
    .map((attachment, i) => ({
      index: i,
      data: attachment
    }))
    .filter((attachment) => !attachment.data.id);
  const existing_attachments = attachments.filter((attachment) => attachment.id);
  const updated_attachments = existing_attachments.filter((attachment) =>
    current_attachments.some((a) => a.id === attachment.id)
  );
  const deleted_attachments = current_attachments.filter(
    (attachment) => !attachments.some((a) => a.id === attachment.id)
  );

  const update_existing =
    updated_attachments.length > 0
      ? (() => {
          const value_rows = updated_attachments.map(
            (a) =>
              sql`(${a.id!}::int, ${a.type}::attachment_type, ${a.url}::text, ${a.order_index}::smallint, ${a.title}::text)`
          );
          return tx.execute(sql`
            UPDATE ${crossword_attachments} AS t
            SET
              type = v.type,
              url = v.url,
              order_index = v.order_index,
              title = v.title,
              updated_at = now()
            FROM (VALUES ${sql.join(value_rows, sql`, `)}) AS v(id, type, url, order_index, title)
            WHERE t.puzzle_id = ${puzzle_id}
              AND t.id = v.id
          `);
        })()
      : Promise.resolve();

  const [new_attachments_inserted] = await Promise.all([
    new_attachments.length > 0
      ? tx
          .insert(crossword_attachments)
          .values(
            new_attachments.map((a) => ({
              puzzle_id,
              type: a.data.type,
              url: a.data.url,
              order_index: a.data.order_index,
              title: a.data.title
            }))
          )
          .returning()
      : ([] as { id: number }[]),
    deleted_attachments.length > 0
      ? tx.delete(crossword_attachments).where(
          and(
            eq(crossword_attachments.puzzle_id, puzzle_id),
            inArray(
              crossword_attachments.id,
              deleted_attachments.map((a) => a.id)
            )
          )
        )
      : Promise.resolve(),
    update_existing
  ]);

  return {
    newly_added_index_ids: new_attachments_inserted.map((a, i) => ({
      id: a.id,
      index: new_attachments[i].index
    }))
  };
};

const check_slug_availability_route = protectedAdminProcedure
  .input(
    z.object({
      slug: z.string(),
      exclude_puzzle_id: z.number().int().optional()
    })
  )
  .query(async ({ input: { slug, exclude_puzzle_id } }) =>
    resolve_slug_availability(slug, { exclude_puzzle_id })
  );

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
      slug: crossword_puzzles.slug,
      image_id: crossword_puzzles.image_id
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
      where: (tbl, { eq: eqFn }) => eqFn(tbl.id, id),
      with: {
        attachments: {
          columns: {
            id: true,
            title: true,
            type: true,
            url: true,
            order_index: true
          },
          orderBy: (tbl, { asc: ascFn }) => ascFn(tbl.order_index)
        },
        image: {
          columns: {
            id: true,
            s3_key: true,
            width: true,
            height: true
          }
        }
      }
    });
    if (!row) return null;
    return row;
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
          or(
            ilike(crossword_puzzles.title, pattern),
            ilike(crossword_puzzles.description, pattern)
          )!
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
          slug: crossword_puzzles.slug,
          title: crossword_puzzles.title,
          description: crossword_puzzles.description,
          listed: crossword_puzzles.listed,
          grid_dimensions: crossword_puzzles.grid_dimensions,
          created_at: crossword_puzzles.created_at,
          updated_at: crossword_puzzles.updated_at,
          image_s3_key: image_assets.s3_key
        })
        .from(crossword_puzzles)
        .leftJoin(image_assets, eq(crossword_puzzles.image_id, image_assets.id))
        .where(whereClause)
        .orderBy(orderPrimary, orderTiebreaker)
        .limit(size)
        .offset(offset)
    ]);

    const list = rows.map(({ image_s3_key, ...puzzle }) => ({
      ...puzzle,
      image: image_s3_key ? { s3_key: image_s3_key } : null
    }));

    const total = Number(countResult[0]?.count ?? 0);
    const pageCount = Math.max(1, Math.ceil(total / size));

    return {
      list,
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
    revalidateCrosswordPaths();

    await assert_slug_usable_for_mutation(input.slug, {
      override_redirect_slug: input.override_redirect_slug
    });

    const dimensions = input.grid_dimensions;
    const [inserted] = await db.transaction(async (tx) => {
      if (input.override_redirect_slug) {
        await delete_redirect_for_slug(tx, input.slug);
      }

      return tx
        .insert(crossword_puzzles)
        .values({
          slug: input.slug,
          title: input.title.trim(),
          description: input.description?.trim() ? input.description.trim() : null,
          grid_dimensions: dimensions,
          grid_data: createEmptyGridData(dimensions),
          word_list: [],
          listed: false
        })
        .returning();
    });

    await invalidate_and_refresh_cached(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS);
    revalidatePath(`/padajala/edit/${inserted!.id}`);
    return { id: inserted!.id };
  });

const update_puzzle_route = protectedAdminProcedure
  .input(crossword_update_input_schema)
  .mutation(async ({ input: { puzzle_id, puzzle_data, puzzle_slug, image_id } }) => {
    revalidateCrosswordPaths(puzzle_slug);

    const existing = await db.query.crossword_puzzles.findFirst({
      columns: { id: true, listed: true },
      where: (tbl, { and: andFn, eq: eqFn }) =>
        andFn(eqFn(tbl.id, puzzle_id), eqFn(tbl.slug, puzzle_slug))
    });
    if (!existing) {
      throw new Error('Puzzle not found or slug mismatch');
    }

    const resolvedWordList = resolveWordListForSave(puzzle_data.grid_data, puzzle_data.word_list);
    const analysis = analyzeWordPlacements(puzzle_data.grid_data, puzzle_data.word_list);

    if (puzzle_data.listed && !analysis.canList) {
      throw new Error(
        'Cannot list puzzle until every word has exactly one valid placement on the grid'
      );
    }

    const prev_listed = existing.listed;
    const { attachments, ...puzzle_data_rest } = puzzle_data;
    const becomingListed = puzzle_data.listed && !prev_listed;

    const { newly_added_index_ids } = await db.transaction(async (tx) => {
      const updated = await tx
        .update(crossword_puzzles)
        .set({
          ...puzzle_data_rest,
          word_list: resolvedWordList,
          image_id,
          ...(becomingListed ? { last_listed_at: new Date() } : {})
        })
        .where(and(eq(crossword_puzzles.id, puzzle_id), eq(crossword_puzzles.slug, puzzle_slug)))
        .returning();

      if (updated.length === 0) {
        throw new Error('Puzzle not found or slug mismatch');
      }

      return update_puzzle_attachments(tx, puzzle_id, attachments);
    });

    await Promise.allSettled([
      (puzzle_data.listed || prev_listed !== puzzle_data.listed) &&
        invalidate_and_refresh_cached(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS),
      invalidate_and_refresh_cached(CACHE.crossword.word_puzzle, { slug: puzzle_slug }),
      (await puzzle_in_current_schedule(puzzle_id)) &&
        invalidate_and_refresh_cached(CACHE.crossword.current_schedule, NO_CACHE_PARAMS),
      (await puzzle_in_next_schedule(puzzle_id)) &&
        invalidate_and_refresh_cached(CACHE.crossword.next_schedule, NO_CACHE_PARAMS)
    ]);

    revalidatePath(`/padajala/edit/${puzzle_id}`);
    return { success: true as const, newly_added_index_ids };
  });

const update_puzzle_slug_route = protectedAdminProcedure
  .input(crossword_update_slug_input_schema)
  .mutation(async ({ input: { puzzle_id, current_slug, new_slug, override_redirect_slug } }) => {
    if (current_slug === new_slug) {
      return { success: true as const, slug: new_slug };
    }

    const puzzle = await db.query.crossword_puzzles.findFirst({
      columns: { id: true, listed: true },
      where: (tbl, { and: andFn, eq: eqFn }) =>
        andFn(eqFn(tbl.id, puzzle_id), eqFn(tbl.slug, current_slug))
    });
    if (!puzzle) {
      throw new Error('Puzzle not found or slug mismatch');
    }

    await assert_slug_usable_for_mutation(new_slug, {
      exclude_puzzle_id: puzzle_id,
      override_redirect_slug
    });

    await db.transaction(async (tx) => {
      await delete_redirect_for_slug(tx, new_slug);

      const updated = await tx
        .update(crossword_puzzles)
        .set({ slug: new_slug })
        .where(and(eq(crossword_puzzles.id, puzzle_id), eq(crossword_puzzles.slug, current_slug)))
        .returning();

      if (updated.length === 0) {
        throw new Error('Puzzle not found or slug mismatch');
      }

      await upsert_redirect_for_puzzle(tx, puzzle_id, current_slug);
    });

    revalidateCrosswordPaths(new_slug);
    revalidateCrosswordPaths(current_slug);

    await Promise.all([
      invalidate_and_refresh_cached(CACHE.crossword.word_puzzle, { slug: new_slug }),
      CACHE.crossword.word_puzzle.delete({ slug: current_slug })
    ]);

    await Promise.allSettled([
      puzzle.listed &&
        invalidate_and_refresh_cached(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS),
      (await puzzle_in_current_schedule(puzzle_id)) &&
        invalidate_and_refresh_cached(CACHE.crossword.current_schedule, NO_CACHE_PARAMS),
      (await puzzle_in_next_schedule(puzzle_id)) &&
        invalidate_and_refresh_cached(CACHE.crossword.next_schedule, NO_CACHE_PARAMS)
    ]);

    revalidatePath(`/padajala/edit/${puzzle_id}`);
    return { success: true as const, slug: new_slug };
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

    revalidateCrosswordPaths(existing.slug);
    await invalidate_and_refresh_cached(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS);
    await invalidate_and_refresh_cached(CACHE.crossword.word_puzzle, { slug: existing.slug });
    return { success: true as const };
  });

const delete_puzzle_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int(), slug: z.string() }))
  .mutation(async ({ input: { id, slug } }) => {
    const normalizedSlug = normalizeSlug(slug);
    const puzzle = await db.query.crossword_puzzles.findFirst({
      columns: { listed: true },
      where: (tbl, { and: andFn, eq: eqFn }) =>
        andFn(eqFn(tbl.id, id), eqFn(tbl.slug, normalizedSlug))
    });
    if (!puzzle) {
      throw new Error('Puzzle not found');
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(crossword_puzzles)
        .where(and(eq(crossword_puzzles.id, id), eq(crossword_puzzles.slug, normalizedSlug)));
    });

    revalidateCrosswordPaths(normalizedSlug);
    revalidatePath(`/padajala/edit/${id}`);

    await Promise.allSettled([
      puzzle.listed &&
        invalidate_and_refresh_cached(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS),
      invalidate_and_refresh_cached(CACHE.crossword.word_puzzle, { slug: normalizedSlug }),
      (await puzzle_in_current_schedule(id)) &&
        invalidate_and_refresh_cached(CACHE.crossword.current_schedule, NO_CACHE_PARAMS),
      (await puzzle_in_next_schedule(id)) &&
        invalidate_and_refresh_cached(CACHE.crossword.next_schedule, NO_CACHE_PARAMS)
    ]);

    return { success: true };
  });

const get_puzzle_slugs_route = protectedAdminProcedure
  .input(z.object({ puzzle_id: z.number().int() }))
  .query(async ({ input: { puzzle_id } }) => {
    const puzzle = await db.query.crossword_puzzles.findFirst({
      columns: { slug: true },
      where: (tbl, { eq: eqFn }) => eqFn(tbl.id, puzzle_id),
      with: {
        redirects: {
          columns: { slug: true, created_at: true },
          orderBy: (tbl, { desc: descFn }) => descFn(tbl.created_at)
        }
      }
    });

    if (!puzzle) {
      throw new Error('Puzzle not found');
    }

    const redirect_slugs = puzzle.redirects.map((redirect) => redirect.slug);
    const all_slugs = [
      puzzle.slug,
      ...redirect_slugs.filter((redirect_slug) => redirect_slug !== puzzle.slug)
    ];

    return {
      current_slug: puzzle.slug,
      redirect_slugs,
      all_slugs
    };
  });

const delete_redirect_slug_route = protectedAdminProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      redirect_slug: crossword_slug_schema
    })
  )
  .mutation(async ({ input: { puzzle_id, redirect_slug } }) => {
    const puzzle = await db.query.crossword_puzzles.findFirst({
      columns: { id: true, slug: true },
      where: (tbl, { eq: eqFn }) => eqFn(tbl.id, puzzle_id)
    });
    if (!puzzle) {
      throw new Error('Puzzle not found');
    }
    if (puzzle.slug === redirect_slug) {
      throw new Error('Cannot delete the current slug');
    }

    const redirect = await db.query.crossword_redirects.findFirst({
      columns: { id: true },
      where: (tbl, { and: andFn, eq: eqFn }) =>
        andFn(eqFn(tbl.slug, redirect_slug), eqFn(tbl.puzzle_id, puzzle_id))
    });
    if (!redirect) {
      throw new Error('Redirect not found');
    }

    await db
      .delete(crossword_redirects)
      .where(
        and(eq(crossword_redirects.id, redirect.id), eq(crossword_redirects.puzzle_id, puzzle_id))
      );

    await CACHE.crossword.word_puzzle.delete({ slug: redirect_slug });
    revalidatePath(`/padajala/${redirect_slug}`);

    return { success: true as const };
  });

const refresh_current_schedule_route = publicProcedure.mutation(async () => {
  await Promise.all([
    invalidate_and_refresh_cached(CACHE.crossword.current_schedule, NO_CACHE_PARAMS),
    invalidate_and_refresh_cached(CACHE.crossword.next_schedule, NO_CACHE_PARAMS)
  ]);
  const current = await CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS);
  return { has_current: current !== undefined };
});

/** Same cap as padavali `get_listed_puzzles_preview`. */
const LISTED_PUZZLES_PREVIEW_LIMIT = 16;

const get_listed_puzzles_preview_input_schema = z.object({
  exclude_slug: z.string().optional(),
  exclude_id: z.number().optional()
});

const get_listed_puzzles_preview_route = publicProcedure
  .input(get_listed_puzzles_preview_input_schema)
  .query(async ({ input }) => {
    const listed = await CACHE.crossword.listed_puzzle_list.get(NO_CACHE_PARAMS);
    let filtered = listed;
    if (input.exclude_slug) {
      filtered = filtered.filter((puzzle) => puzzle.slug !== input.exclude_slug);
    }
    if (input.exclude_id !== undefined) {
      filtered = filtered.filter((puzzle) => puzzle.id !== input.exclude_id);
    }
    return filtered.slice(0, LISTED_PUZZLES_PREVIEW_LIMIT);
  });

export const crossword_router = t.router({
  check_slug_availability: check_slug_availability_route,
  get_listed_puzzles: get_listed_puzzles_route,
  get_listed_puzzles_preview: get_listed_puzzles_preview_route,
  get_puzzle_by_id: get_puzzle_by_id_route,
  get_puzzle_list_page: get_puzzle_list_page_route,
  add_puzzle: add_puzzle_route,
  update_puzzle: update_puzzle_route,
  update_puzzle_slug: update_puzzle_slug_route,
  set_listed: set_listed_route,
  delete_puzzle: delete_puzzle_route,
  get_puzzle_slugs: get_puzzle_slugs_route,
  delete_redirect_slug: delete_redirect_slug_route,
  refresh_current_schedule: refresh_current_schedule_route,
  stats: crossword_stats_router,
  schedules: crossword_schedules_router
});

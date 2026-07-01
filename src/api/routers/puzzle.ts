import { z } from 'zod';
import { protectedAdminProcedure, publicProcedure, t } from '../trpc_init';
import { db, type transactionType } from '~/db/db';
import { word_puzzle_attachments, word_puzzle_redirects, word_puzzles } from '~/db/schema';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { padavali_stats_router } from './padavali_stats';
import {
  CACHE,
  invalidate_and_refresh_cached,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import {
  puzzle_add_input_schema,
  puzzle_update_input_schema,
  puzzle_update_slug_input_schema,
  slug_schema
} from '~/db/db_shared_vals';
import { sendOneSignalNotification } from '~/lib/onesignal';
import { delay } from '~/tools/delay';
import {
  createEmptyGridData,
  DEFAULT_GRID_DIMENSIONS,
  isValidSlug,
  normalizeSlug
} from '~/util/puzzle/slug';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';

const puzzle_in_current_schedule = async (id: number) => {
  const current_schedule = await CACHE.current_schedule.get(NO_CACHE_PARAMS);
  return current_schedule?.puzzle.id === id;
};

const puzzle_in_next_schedule = async (id: number) => {
  const next_schedule = await CACHE.next_schedule.get(NO_CACHE_PARAMS);
  return next_schedule?.puzzle.id === id;
};

export const notify_for_listed_puzzle = async (title: string, slug: string) => {
  return await sendOneSignalNotification({
    headings: { en: '🧩 New Listed Puzzle Added! 🎉' },
    contents: {
      en: `"${title}" - Listed Puzzle Added, Play Now! 🚀`
    },
    name: `new_listed_puzzle:${slug}`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/padavali/${slug}`
  });
};

type AttachmentInput = z.infer<typeof puzzle_update_input_schema>['puzzle_data']['attachments'];

const update_puzzle_attachments = async (
  tx: transactionType,
  puzzle_id: number,
  attachments: AttachmentInput
) => {
  const current_attachments = await tx.query.word_puzzle_attachments.findMany({
    where: (tbl, { eq }) => eq(tbl.puzzle_id, puzzle_id),
    columns: {
      id: true
    }
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
  const [new_attachments_inserted] = await Promise.all([
    new_attachments.length > 0
      ? tx
          .insert(word_puzzle_attachments)
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
      ? tx.delete(word_puzzle_attachments).where(
          and(
            eq(word_puzzle_attachments.puzzle_id, puzzle_id),
            inArray(
              word_puzzle_attachments.id,
              deleted_attachments.map((a) => a.id)
            )
          )
        )
      : Promise.resolve(),
    ...updated_attachments.map((a) =>
      tx
        .update(word_puzzle_attachments)
        .set({
          type: a.type,
          url: a.url,
          order_index: a.order_index,
          title: a.title
        })
        .where(
          and(
            eq(word_puzzle_attachments.id, a.id!),
            eq(word_puzzle_attachments.puzzle_id, puzzle_id)
          )
        )
    )
  ]);

  return {
    newly_added_index_ids: new_attachments_inserted.map((a, i) => ({
      id: a.id,
      index: new_attachments[i].index
    }))
  };
};

type SlugAvailabilityOptions = {
  exclude_puzzle_id?: number;
};

const resolve_slug_availability = async (slug: string, options: SlugAvailabilityOptions = {}) => {
  const { exclude_puzzle_id } = options;
  const normalized = normalizeSlug(slug);
  if (!isValidSlug(normalized)) {
    return { available: false as const, reason: 'invalid_format' as const, slug: normalized };
  }

  const [existing_puzzle, existing_redirect] = await Promise.all([
    db.query.word_puzzles.findFirst({
      where: (tbl, { eq }) => eq(tbl.slug, normalized),
      columns: { id: true, slug: true, title: true }
    }),
    db.query.word_puzzle_redirects.findFirst({
      where: (tbl, { eq }) => eq(tbl.slug, normalized),
      with: {
        puzzle: {
          columns: { id: true, slug: true, title: true }
        }
      }
    })
  ]);

  if (
    existing_puzzle &&
    !(exclude_puzzle_id !== undefined && existing_puzzle.id === exclude_puzzle_id)
  ) {
    return {
      available: false as const,
      reason: 'taken' as const,
      slug: normalized,
      conflicting_puzzle: existing_puzzle
    };
  }

  if (
    existing_redirect?.puzzle &&
    !(exclude_puzzle_id !== undefined && existing_redirect.puzzle.id === exclude_puzzle_id)
  ) {
    return {
      available: true as const,
      slug: normalized,
      redirect_conflict: {
        redirect_id: existing_redirect.id,
        redirect_slug: existing_redirect.slug,
        puzzle: existing_redirect.puzzle
      }
    };
  }

  return { available: true as const, slug: normalized };
};

const assert_slug_usable_for_mutation = async (
  slug: string,
  options: SlugAvailabilityOptions & { override_redirect_slug: boolean }
) => {
  const availability = await resolve_slug_availability(slug, options);

  if (!availability.available) {
    if (availability.reason === 'invalid_format') {
      throw new Error('Invalid slug format');
    }
    throw new Error('Slug is already taken by another puzzle');
  }

  if ('redirect_conflict' in availability && availability.redirect_conflict) {
    if (!options.override_redirect_slug) {
      throw new Error('Slug conflicts with an existing redirect; confirmation required');
    }
  }

  return availability;
};

const delete_redirect_for_slug = async (tx: transactionType, slug: string) => {
  await tx.delete(word_puzzle_redirects).where(eq(word_puzzle_redirects.slug, slug));
};

const upsert_redirect_for_puzzle = async (
  tx: transactionType,
  puzzle_id: number,
  redirect_slug: string
) => {
  await tx
    .insert(word_puzzle_redirects)
    .values({
      puzzle_id,
      slug: redirect_slug
    })
    .onConflictDoUpdate({
      target: word_puzzle_redirects.slug,
      set: { puzzle_id }
    });
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

const update_puzzle_route = protectedAdminProcedure
  .input(puzzle_update_input_schema)
  .mutation(async ({ input: { puzzle_id, puzzle_data, puzzle_slug, image_id } }) => {
    revalidatePath('/padavali/list');
    const existing = await db.query.word_puzzles.findFirst({
      columns: {
        listed: true
      },
      where: (tbl, { and, eq }) => and(eq(tbl.id, puzzle_id), eq(tbl.slug, puzzle_slug))
    });
    if (!existing) {
      throw new Error('Puzzle not found or slug mismatch');
    }
    const prev_listed = existing.listed;
    const { attachments, ...puzzle_data_rest } = puzzle_data;

    const { newly_added_index_ids } = await db.transaction(async (tx) => {
      const updated = await tx
        .update(word_puzzles)
        .set({ ...puzzle_data_rest, image_id })
        .where(and(eq(word_puzzles.id, puzzle_id), eq(word_puzzles.slug, puzzle_slug)))
        .returning();

      if (updated.length === 0) {
        throw new Error('Puzzle not found or slug mismatch');
      }

      if (!prev_listed && puzzle_data.listed) {
        await tx
          .update(word_puzzles)
          .set({ last_listed_at: new Date() })
          .where(and(eq(word_puzzles.id, puzzle_id), eq(word_puzzles.slug, puzzle_slug)));
      }

      return update_puzzle_attachments(tx, puzzle_id, attachments);
    });

    await Promise.allSettled([
      (puzzle_data.listed || prev_listed !== puzzle_data.listed) &&
        invalidate_and_refresh_cached(CACHE.listed_puzzle_list, NO_CACHE_PARAMS),
      invalidate_and_refresh_cached(CACHE.word_puzzle, {
        slug: puzzle_slug
      }),
      invalidate_and_refresh_cached(CACHE.word_meanings, {
        slug: puzzle_slug
      }),
      (await puzzle_in_current_schedule(puzzle_id)) &&
        invalidate_and_refresh_cached(CACHE.current_schedule, NO_CACHE_PARAMS),
      puzzle_data.listed &&
        !prev_listed &&
        notify_for_listed_puzzle(puzzle_data_rest.title, puzzle_slug)
    ]);
    return {
      success: true,
      newly_added_index_ids
    };
  });

const update_puzzle_slug_route = protectedAdminProcedure
  .input(puzzle_update_slug_input_schema)
  .mutation(async ({ input: { puzzle_id, current_slug, new_slug, override_redirect_slug } }) => {
    if (current_slug === new_slug) {
      return { success: true as const, slug: new_slug };
    }

    const puzzle = await db.query.word_puzzles.findFirst({
      columns: { id: true, listed: true },
      where: (tbl, { and, eq }) => and(eq(tbl.id, puzzle_id), eq(tbl.slug, current_slug))
    });
    if (!puzzle) {
      throw new Error('Puzzle not found or slug mismatch');
    }

    await assert_slug_usable_for_mutation(new_slug, {
      exclude_puzzle_id: puzzle_id,
      override_redirect_slug
    });

    await db.transaction(async (tx) => {
      if (override_redirect_slug) {
        await delete_redirect_for_slug(tx, new_slug);
      }

      const updated = await tx
        .update(word_puzzles)
        .set({ slug: new_slug })
        .where(and(eq(word_puzzles.id, puzzle_id), eq(word_puzzles.slug, current_slug)))
        .returning();

      if (updated.length === 0) {
        throw new Error('Puzzle not found or slug mismatch');
      }

      await upsert_redirect_for_puzzle(tx, puzzle_id, current_slug);
    });

    revalidatePath('/padavali/list');

    await CACHE.word_puzzle.delete({ slug: current_slug });
    await CACHE.word_meanings.delete({ slug: current_slug });
    await invalidate_and_refresh_cached(CACHE.word_puzzle, { slug: new_slug });
    await invalidate_and_refresh_cached(CACHE.word_meanings, { slug: new_slug });

    await Promise.allSettled([
      puzzle.listed && invalidate_and_refresh_cached(CACHE.listed_puzzle_list, NO_CACHE_PARAMS),
      (await puzzle_in_current_schedule(puzzle_id)) &&
        invalidate_and_refresh_cached(CACHE.current_schedule, NO_CACHE_PARAMS),
      (await puzzle_in_next_schedule(puzzle_id)) &&
        invalidate_and_refresh_cached(CACHE.next_schedule, NO_CACHE_PARAMS)
    ]);

    return { success: true as const, slug: new_slug };
  });

const add_puzzle_route = protectedAdminProcedure
  .input(puzzle_add_input_schema)
  .mutation(async ({ input }) => {
    revalidatePath('/padavali/list');

    await assert_slug_usable_for_mutation(input.slug, {
      override_redirect_slug: input.override_redirect_slug
    });

    const [inserted] = await db.transaction(async (tx) => {
      if (input.override_redirect_slug) {
        await delete_redirect_for_slug(tx, input.slug);
      }

      return tx
        .insert(word_puzzles)
        .values({
          title: input.title,
          slug: input.slug,
          description: input.description?.trim() ? input.description.trim() : null,
          word_list: [],
          grid_data: createEmptyGridData(DEFAULT_GRID_DIMENSIONS),
          grid_dimensions: DEFAULT_GRID_DIMENSIONS,
          listed: false
        })
        .returning();
    });

    return { id: inserted.id };
  });

const delete_puzzle_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int(), slug: z.string() }))
  .mutation(async ({ input: { id, slug } }) => {
    revalidatePath('/padavali/list');
    const normalizedSlug = normalizeSlug(slug);
    const puzzle = await db.query.word_puzzles.findFirst({
      columns: {
        listed: true
      },
      where: (tbl, { and, eq }) => and(eq(tbl.id, id), eq(tbl.slug, normalizedSlug))
    });
    if (!puzzle) {
      throw new Error('Puzzle not found');
    }
    const { listed } = puzzle;

    await db.transaction(async (tx) => {
      await tx
        .delete(word_puzzles)
        .where(and(eq(word_puzzles.id, id), eq(word_puzzles.slug, normalizedSlug)));
    });

    await Promise.allSettled([
      listed && invalidate_and_refresh_cached(CACHE.listed_puzzle_list, NO_CACHE_PARAMS),
      invalidate_and_refresh_cached(CACHE.word_puzzle, {
        slug: normalizedSlug
      }),
      CACHE.word_meanings.delete({ slug: normalizedSlug }),
      (await puzzle_in_current_schedule(id)) &&
        invalidate_and_refresh_cached(CACHE.current_schedule, NO_CACHE_PARAMS),
      (await puzzle_in_next_schedule(id)) &&
        invalidate_and_refresh_cached(CACHE.next_schedule, NO_CACHE_PARAMS)
    ]);
    return {
      success: true
    };
  });

const get_puzzle_list_input_schema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(100).default(12),
  search_title: z.string().max(500).optional(),
  listed_filter: z.boolean().optional(),
  sort_by: z.enum(['created_at', 'updated_at']).optional().default('created_at'),
  order_by: z.enum(['asc', 'desc']).optional().default('desc')
});

export const get_puzzle_list_page = async (input: z.input<typeof get_puzzle_list_input_schema>) => {
  const { page, size, search_title, listed_filter, sort_by, order_by } =
    get_puzzle_list_input_schema.parse(input);

  const trimmedSearch = search_title?.trim();
  const conditions = [];
  if (typeof listed_filter === 'boolean') {
    conditions.push(eq(word_puzzles.listed, listed_filter));
  }
  if (trimmedSearch) {
    for (const token of tokenizeSearchQuery(trimmedSearch)) {
      const pattern = `%${escapeIlikeToken(token)}%`;
      conditions.push(
        or(ilike(word_puzzles.title, pattern), ilike(word_puzzles.description, pattern))!
      );
    }
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortCol =
    sort_by === 'updated_at'
      ? sql`coalesce(${word_puzzles.updated_at}, ${word_puzzles.created_at})`
      : word_puzzles.created_at;
  const orderPrimary = order_by === 'desc' ? desc(sortCol) : asc(sortCol);
  const orderTiebreaker = order_by === 'desc' ? desc(word_puzzles.id) : asc(word_puzzles.id);
  const offset = (page - 1) * size;

  await delay(400);

  const [countResult, list] = await Promise.all([
    db.select({ count: count() }).from(word_puzzles).where(whereClause),
    db
      .select({
        id: word_puzzles.id,
        slug: word_puzzles.slug,
        title: word_puzzles.title,
        description: word_puzzles.description,
        listed: word_puzzles.listed,
        created_at: word_puzzles.created_at,
        updated_at: word_puzzles.updated_at
      })
      .from(word_puzzles)
      .where(whereClause)
      .orderBy(orderPrimary, orderTiebreaker)
      .limit(size)
      .offset(offset)
  ]);

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
};

const get_puzzle_list_page_route = protectedAdminProcedure
  .input(get_puzzle_list_input_schema)
  .query(async ({ input }) => await get_puzzle_list_page(input));

const LISTED_PUZZLES_PREVIEW_LIMIT = 16;

const get_listed_puzzles_preview_input_schema = z.object({
  exclude_slug: z.string().optional(),
  exclude_id: z.number().optional()
});

const get_listed_puzzles_preview_route = publicProcedure
  .input(get_listed_puzzles_preview_input_schema)
  .query(async ({ input }) => {
    const listed = await CACHE.listed_puzzle_list.get(NO_CACHE_PARAMS);
    let filtered = listed;
    if (input.exclude_slug) {
      filtered = filtered.filter((puzzle) => puzzle.slug !== input.exclude_slug);
    }
    if (input.exclude_id !== undefined) {
      filtered = filtered.filter((puzzle) => puzzle.id !== input.exclude_id);
    }
    return filtered.slice(0, LISTED_PUZZLES_PREVIEW_LIMIT);
  });

const refresh_current_schedule_route = publicProcedure.mutation(async () => {
  await Promise.all([
    invalidate_and_refresh_cached(CACHE.current_schedule, NO_CACHE_PARAMS),
    invalidate_and_refresh_cached(CACHE.next_schedule, NO_CACHE_PARAMS)
  ]);
  const current = await CACHE.current_schedule.get(NO_CACHE_PARAMS);
  return { has_current: current !== undefined };
});

const get_puzzle_slugs_route = protectedAdminProcedure
  .input(z.object({ puzzle_id: z.number().int() }))
  .query(async ({ input: { puzzle_id } }) => {
    const puzzle = await db.query.word_puzzles.findFirst({
      columns: { slug: true },
      where: (tbl, { eq }) => eq(tbl.id, puzzle_id),
      with: {
        redirects: {
          columns: { slug: true, created_at: true },
          orderBy: (tbl, { desc }) => desc(tbl.created_at)
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
      redirect_slug: slug_schema
    })
  )
  .mutation(async ({ input: { puzzle_id, redirect_slug } }) => {
    const puzzle = await db.query.word_puzzles.findFirst({
      columns: { id: true, slug: true },
      where: (tbl, { eq }) => eq(tbl.id, puzzle_id)
    });
    if (!puzzle) {
      throw new Error('Puzzle not found');
    }
    if (puzzle.slug === redirect_slug) {
      throw new Error('Cannot delete the current slug');
    }

    const redirect = await db.query.word_puzzle_redirects.findFirst({
      columns: { id: true },
      where: (tbl, { and, eq }) => and(eq(tbl.slug, redirect_slug), eq(tbl.puzzle_id, puzzle_id))
    });
    if (!redirect) {
      throw new Error('Redirect not found');
    }

    await db
      .delete(word_puzzle_redirects)
      .where(
        and(
          eq(word_puzzle_redirects.id, redirect.id),
          eq(word_puzzle_redirects.puzzle_id, puzzle_id)
        )
      );

    await Promise.allSettled([
      CACHE.word_puzzle.delete({ slug: redirect_slug }),
      CACHE.word_meanings.delete({ slug: redirect_slug })
    ]);
    revalidatePath(`/padavali/${redirect_slug}`);

    return { success: true as const };
  });

export const puzzle_router = t.router({
  check_slug_availability: check_slug_availability_route,
  update_puzzle: update_puzzle_route,
  update_puzzle_slug: update_puzzle_slug_route,
  add_puzzle: add_puzzle_route,
  delete_puzzle: delete_puzzle_route,
  stats: padavali_stats_router,
  get_puzzle_list_page: get_puzzle_list_page_route,
  get_listed_puzzles_preview: get_listed_puzzles_preview_route,
  refresh_current_schedule: refresh_current_schedule_route,
  get_puzzle_slugs: get_puzzle_slugs_route,
  delete_redirect_slug: delete_redirect_slug_route
});

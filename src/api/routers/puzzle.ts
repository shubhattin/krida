import { Effect } from 'effect';
import { z } from 'zod';
import { protectedAdminProcedure, publicProcedure, t } from '../trpc_init';
import { dbRun, dbTransaction, type DbTransaction } from '~/effect/database';
import {
  padavali_attachments,
  padavali_redirects,
  padavali_puzzles,
  image_assets
} from '~/db/schema';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { padavali_stats_router } from './padavali_stats';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import {
  puzzle_add_input_schema,
  puzzle_update_input_schema,
  puzzle_update_slug_input_schema,
  slug_schema
} from '~/db/db_shared_vals';
import { NotificationService } from '~/effect/notifications';
import {
  createEmptyGridData,
  DEFAULT_GRID_DIMENSIONS,
  isValidSlug,
  normalizeSlug
} from '~/util/puzzle/slug';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';
import { BadRequestError, ConflictError, NotFoundError } from '~/effect/errors';
import { AppConfig } from '~/effect/config';
import { runTrpcEffect } from '~/effect/run';

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.catch(() => Effect.void));

const puzzle_in_current_schedule = Effect.fn('padavali.puzzle_in_current_schedule')(function* (
  id: number
) {
  const current_schedule = yield* CACHE.padavali.current_schedule.get(NO_CACHE_PARAMS);
  return current_schedule?.puzzle.id === id;
});

const puzzle_in_next_schedule = Effect.fn('padavali.puzzle_in_next_schedule')(function* (
  id: number
) {
  const next_schedule = yield* CACHE.padavali.next_schedule.get(NO_CACHE_PARAMS);
  return next_schedule?.puzzle.id === id;
});

export const notify_for_listed_puzzle = Effect.fn('padavali.notify_for_listed_puzzle')(function* (
  title: string,
  slug: string
) {
  const config = yield* AppConfig;
  const notifications = yield* NotificationService;
  return yield* notifications.send({
    headings: { en: '🧩 New Listed Puzzle Added! 🎉' },
    contents: {
      en: `"${title}" - Listed Puzzle Added, Play Now! 🚀`
    },
    name: `new_listed_puzzle:${slug}`,
    url: `${config.siteUrl}/padavali/${slug}`
  });
});

type AttachmentInput = z.infer<typeof puzzle_update_input_schema>['puzzle_data']['attachments'];

const update_puzzle_attachments = async (
  tx: DbTransaction,
  puzzle_id: number,
  attachments: AttachmentInput
) => {
  const current_attachments = await tx.query.padavali_attachments.findMany({
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

  const update_existing =
    updated_attachments.length > 0
      ? (() => {
          const value_rows = updated_attachments.map(
            (a) =>
              sql`(${a.id!}::int, ${a.type}::attachment_type, ${a.url}::text, ${a.order_index}::smallint, ${a.title}::text)`
          );
          return tx.execute(sql`
            UPDATE ${padavali_attachments} AS t
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
          .insert(padavali_attachments)
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
      ? tx.delete(padavali_attachments).where(
          and(
            eq(padavali_attachments.puzzle_id, puzzle_id),
            inArray(
              padavali_attachments.id,
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

type SlugAvailabilityOptions = {
  exclude_puzzle_id?: number;
};

const resolve_slug_availability = Effect.fn('padavali.resolve_slug_availability')(function* (
  slug: string,
  options: SlugAvailabilityOptions = {}
) {
  const { exclude_puzzle_id } = options;
  const normalized = normalizeSlug(slug);
  if (!isValidSlug(normalized)) {
    return { available: false as const, reason: 'invalid_format' as const, slug: normalized };
  }

  const { existing_puzzle, existing_redirect } = yield* Effect.all({
    existing_puzzle: dbRun('padavali.find_puzzle_by_slug', (client) =>
      client.query.padavali_puzzles.findFirst({
        where: (tbl, { eq }) => eq(tbl.slug, normalized),
        columns: { id: true, slug: true, title: true }
      })
    ),
    existing_redirect: dbRun('padavali.find_redirect_by_slug', (client) =>
      client.query.padavali_redirects.findFirst({
        where: (tbl, { eq }) => eq(tbl.slug, normalized),
        with: {
          puzzle: {
            columns: { id: true, slug: true, title: true }
          }
        }
      })
    )
  });

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
});

const assert_slug_usable_for_mutation = Effect.fn('padavali.assert_slug_usable_for_mutation')(
  function* (slug: string, options: SlugAvailabilityOptions & { override_redirect_slug: boolean }) {
    const availability = yield* resolve_slug_availability(slug, options);

    if (!availability.available) {
      if (availability.reason === 'invalid_format') {
        return yield* Effect.fail(
          BadRequestError.make({
            message: 'Invalid slug format'
          })
        );
      }
      return yield* Effect.fail(
        ConflictError.make({
          message: 'Slug is already taken by another puzzle'
        })
      );
    }

    if ('redirect_conflict' in availability && availability.redirect_conflict) {
      if (!options.override_redirect_slug) {
        return yield* Effect.fail(
          ConflictError.make({
            message: 'Slug conflicts with an existing redirect; confirmation required'
          })
        );
      }
    }

    return availability;
  }
);

const delete_redirect_for_slug = async (tx: DbTransaction, slug: string) => {
  await tx.delete(padavali_redirects).where(eq(padavali_redirects.slug, slug));
};

const upsert_redirect_for_puzzle = async (
  tx: DbTransaction,
  puzzle_id: number,
  redirect_slug: string
) => {
  await tx
    .insert(padavali_redirects)
    .values({
      puzzle_id,
      slug: redirect_slug
    })
    .onConflictDoUpdate({
      target: padavali_redirects.slug,
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
  .query(({ input: { slug, exclude_puzzle_id } }) =>
    runTrpcEffect(resolve_slug_availability(slug, { exclude_puzzle_id }))
  );

const word_lists_equal = (a: string[], b: string[]) =>
  a.length === b.length && a.every((word, i) => word === b[i]);

const update_puzzle_route = protectedAdminProcedure
  .input(puzzle_update_input_schema)
  .mutation(({ input: { puzzle_id, puzzle_data, puzzle_slug, image_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* Effect.sync(() => revalidatePath('/padavali/list'));
        const existing = yield* dbRun('padavali.find_puzzle_for_update', (client) =>
          client.query.padavali_puzzles.findFirst({
            columns: {
              listed: true,
              title: true,
              description: true,
              word_list: true
            },
            where: (tbl, { and, eq }) => and(eq(tbl.id, puzzle_id), eq(tbl.slug, puzzle_slug))
          })
        );
        if (!existing) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_puzzle',
              message: 'Puzzle not found or slug mismatch'
            })
          );
        }
        const prev_listed = existing.listed;
        const { attachments, ...puzzle_data_rest } = puzzle_data;
        const meanings_input_changed =
          existing.title !== puzzle_data.title ||
          existing.description !== puzzle_data.description ||
          !word_lists_equal(existing.word_list, puzzle_data.word_list);

        const { updated_count, newly_added_index_ids } = yield* dbTransaction(
          'padavali.update_puzzle',
          async (tx) => {
            const updated = await tx
              .update(padavali_puzzles)
              .set({ ...puzzle_data_rest, image_id })
              .where(
                and(eq(padavali_puzzles.id, puzzle_id), eq(padavali_puzzles.slug, puzzle_slug))
              )
              .returning();

            if (!prev_listed && puzzle_data.listed) {
              await tx
                .update(padavali_puzzles)
                .set({ last_listed_at: new Date() })
                .where(
                  and(eq(padavali_puzzles.id, puzzle_id), eq(padavali_puzzles.slug, puzzle_slug))
                );
            }

            const attachment_result = await update_puzzle_attachments(tx, puzzle_id, attachments);
            return {
              updated_count: updated.length,
              newly_added_index_ids: attachment_result.newly_added_index_ids
            };
          }
        );

        if (updated_count === 0) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_puzzle',
              message: 'Puzzle not found or slug mismatch'
            })
          );
        }

        if (puzzle_data.listed || prev_listed !== puzzle_data.listed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.padavali.listed_puzzle_list, NO_CACHE_PARAMS)
          );
        }
        yield* settle(
          invalidate_and_refresh_cache(CACHE.padavali.word_puzzle, { slug: puzzle_slug })
        );
        if (meanings_input_changed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.padavali.word_meanings, { slug: puzzle_slug })
          );
        }
        if (yield* puzzle_in_current_schedule(puzzle_id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.padavali.current_schedule, NO_CACHE_PARAMS)
          );
        }
        if (puzzle_data.listed && !prev_listed) {
          yield* settle(notify_for_listed_puzzle(puzzle_data_rest.title, puzzle_slug));
        }

        return {
          success: true,
          newly_added_index_ids
        };
      })
    )
  );

const update_puzzle_slug_route = protectedAdminProcedure
  .input(puzzle_update_slug_input_schema)
  .mutation(({ input: { puzzle_id, current_slug, new_slug, override_redirect_slug } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        if (current_slug === new_slug) {
          return { success: true as const, slug: new_slug };
        }

        const puzzle = yield* dbRun('padavali.find_puzzle_for_slug_update', (client) =>
          client.query.padavali_puzzles.findFirst({
            columns: { id: true, listed: true },
            where: (tbl, { and, eq }) => and(eq(tbl.id, puzzle_id), eq(tbl.slug, current_slug))
          })
        );
        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_puzzle',
              message: 'Puzzle not found or slug mismatch'
            })
          );
        }

        yield* assert_slug_usable_for_mutation(new_slug, {
          exclude_puzzle_id: puzzle_id,
          override_redirect_slug
        });

        const updated_count = yield* dbTransaction('padavali.update_puzzle_slug', async (tx) => {
          await delete_redirect_for_slug(tx, new_slug);

          const updated = await tx
            .update(padavali_puzzles)
            .set({ slug: new_slug })
            .where(and(eq(padavali_puzzles.id, puzzle_id), eq(padavali_puzzles.slug, current_slug)))
            .returning();

          if (updated.length > 0) {
            await upsert_redirect_for_puzzle(tx, puzzle_id, current_slug);
          }

          return updated.length;
        });

        if (updated_count === 0) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_puzzle',
              message: 'Puzzle not found or slug mismatch'
            })
          );
        }

        yield* Effect.sync(() => revalidatePath('/padavali/list'));
        yield* settle(invalidate_and_refresh_cache(CACHE.padavali.word_puzzle, { slug: new_slug }));
        yield* settle(CACHE.padavali.word_puzzle.delete({ slug: current_slug }));
        yield* settle(
          invalidate_and_refresh_cache(CACHE.padavali.word_meanings, { slug: new_slug })
        );
        yield* settle(CACHE.padavali.word_meanings.delete({ slug: current_slug }));

        if (puzzle.listed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.padavali.listed_puzzle_list, NO_CACHE_PARAMS)
          );
        }
        if (yield* puzzle_in_current_schedule(puzzle_id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.padavali.current_schedule, NO_CACHE_PARAMS)
          );
        }
        if (yield* puzzle_in_next_schedule(puzzle_id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.padavali.next_schedule, NO_CACHE_PARAMS)
          );
        }

        return { success: true as const, slug: new_slug };
      })
    )
  );

const add_puzzle_route = protectedAdminProcedure
  .input(puzzle_add_input_schema)
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* Effect.sync(() => revalidatePath('/padavali/list'));

        yield* assert_slug_usable_for_mutation(input.slug, {
          override_redirect_slug: input.override_redirect_slug
        });

        const inserted_puzzles = yield* dbTransaction('padavali.insert_puzzle', async (tx) => {
          if (input.override_redirect_slug) {
            await delete_redirect_for_slug(tx, input.slug);
          }

          return tx
            .insert(padavali_puzzles)
            .values({
              title: input.title,
              slug: input.slug,
              description: input.description?.trim() ?? '',
              word_list: [],
              grid_data: createEmptyGridData(DEFAULT_GRID_DIMENSIONS),
              grid_dimensions: DEFAULT_GRID_DIMENSIONS,
              listed: false
            })
            .returning();
        });
        const inserted = inserted_puzzles[0];
        if (!inserted) {
          throw new Error('Failed to create puzzle');
        }

        return { id: inserted.id };
      })
    )
  );

const delete_puzzle_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int(), slug: z.string() }))
  .mutation(({ input: { id, slug } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* Effect.sync(() => revalidatePath('/padavali/list'));
        const normalizedSlug = normalizeSlug(slug);
        const puzzle = yield* dbRun('padavali.find_puzzle_for_delete', (client) =>
          client.query.padavali_puzzles.findFirst({
            columns: {
              listed: true
            },
            where: (tbl, { and, eq }) => and(eq(tbl.id, id), eq(tbl.slug, normalizedSlug))
          })
        );
        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_puzzle',
              message: 'Puzzle not found'
            })
          );
        }
        const { listed } = puzzle;

        yield* dbTransaction('padavali.delete_puzzle', async (tx) => {
          await tx
            .delete(padavali_puzzles)
            .where(and(eq(padavali_puzzles.id, id), eq(padavali_puzzles.slug, normalizedSlug)));
        });

        if (listed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.padavali.listed_puzzle_list, NO_CACHE_PARAMS)
          );
        }
        yield* settle(
          invalidate_and_refresh_cache(CACHE.padavali.word_puzzle, {
            slug: normalizedSlug
          })
        );
        yield* settle(CACHE.padavali.word_meanings.delete({ slug: normalizedSlug }));
        if (yield* puzzle_in_current_schedule(id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.padavali.current_schedule, NO_CACHE_PARAMS)
          );
        }
        if (yield* puzzle_in_next_schedule(id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.padavali.next_schedule, NO_CACHE_PARAMS)
          );
        }
        return {
          success: true
        };
      })
    )
  );

const get_puzzle_list_input_schema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(100).default(12),
  search_title: z.string().max(500).optional(),
  listed_filter: z.boolean().optional(),
  sort_by: z.enum(['created_at', 'updated_at']).optional().default('created_at'),
  order_by: z.enum(['asc', 'desc']).optional().default('desc')
});

export const get_puzzle_list_page = Effect.fn('padavali.get_puzzle_list_page')(function* (
  input: z.input<typeof get_puzzle_list_input_schema>
) {
  const { page, size, search_title, listed_filter, sort_by, order_by } =
    get_puzzle_list_input_schema.parse(input);

  const trimmedSearch = search_title?.trim();
  const conditions = [];
  if (typeof listed_filter === 'boolean') {
    conditions.push(eq(padavali_puzzles.listed, listed_filter));
  }
  if (trimmedSearch) {
    for (const token of tokenizeSearchQuery(trimmedSearch)) {
      const pattern = `%${escapeIlikeToken(token)}%`;
      conditions.push(
        or(ilike(padavali_puzzles.title, pattern), ilike(padavali_puzzles.description, pattern))!
      );
    }
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortCol =
    sort_by === 'updated_at'
      ? sql`coalesce(${padavali_puzzles.updated_at}, ${padavali_puzzles.created_at})`
      : padavali_puzzles.created_at;
  const orderPrimary = order_by === 'desc' ? desc(sortCol) : asc(sortCol);
  const orderTiebreaker =
    order_by === 'desc' ? desc(padavali_puzzles.id) : asc(padavali_puzzles.id);
  const offset = (page - 1) * size;

  const { countResult, rows } = yield* Effect.all({
    countResult: dbRun('padavali.count_puzzle_list_page', (client) =>
      client.select({ count: count() }).from(padavali_puzzles).where(whereClause)
    ),
    rows: dbRun('padavali.select_puzzle_list_page', (client) =>
      client
        .select({
          id: padavali_puzzles.id,
          slug: padavali_puzzles.slug,
          title: padavali_puzzles.title,
          description: padavali_puzzles.description,
          listed: padavali_puzzles.listed,
          created_at: padavali_puzzles.created_at,
          updated_at: padavali_puzzles.updated_at,
          image_s3_key: image_assets.s3_key
        })
        .from(padavali_puzzles)
        .leftJoin(image_assets, eq(padavali_puzzles.image_id, image_assets.id))
        .where(whereClause)
        .orderBy(orderPrimary, orderTiebreaker)
        .limit(size)
        .offset(offset)
    )
  });

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

const get_puzzle_list_page_route = protectedAdminProcedure
  .input(get_puzzle_list_input_schema)
  .query(({ input }) => runTrpcEffect(get_puzzle_list_page(input)));

const LISTED_PUZZLES_PREVIEW_LIMIT = 16;

const get_listed_puzzles_preview_input_schema = z.object({
  exclude_slug: z.string().optional(),
  exclude_id: z.number().optional()
});

const get_listed_puzzles_preview_route = publicProcedure
  .input(get_listed_puzzles_preview_input_schema)
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const listed = yield* CACHE.padavali.listed_puzzle_list.get(NO_CACHE_PARAMS);
        let filtered = listed;
        if (input.exclude_slug) {
          filtered = filtered.filter((puzzle) => puzzle.slug !== input.exclude_slug);
        }
        if (input.exclude_id !== undefined) {
          filtered = filtered.filter((puzzle) => puzzle.id !== input.exclude_id);
        }
        return filtered.slice(0, LISTED_PUZZLES_PREVIEW_LIMIT);
      })
    )
  );

/** Public: waiting-room UI refreshes schedule cache when countdown ends. */
const refresh_current_schedule_route = publicProcedure.mutation(() =>
  runTrpcEffect(
    Effect.gen(function* () {
      yield* invalidate_and_refresh_cache(CACHE.padavali.current_schedule, NO_CACHE_PARAMS);
      yield* invalidate_and_refresh_cache(CACHE.padavali.next_schedule, NO_CACHE_PARAMS);
      const current = yield* CACHE.padavali.current_schedule.get(NO_CACHE_PARAMS);
      return { has_current: current !== undefined };
    })
  )
);

const get_puzzle_slugs_route = protectedAdminProcedure
  .input(z.object({ puzzle_id: z.number().int() }))
  .query(({ input: { puzzle_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const puzzle = yield* dbRun('padavali.get_puzzle_slugs', (client) =>
          client.query.padavali_puzzles.findFirst({
            columns: { slug: true },
            where: (tbl, { eq }) => eq(tbl.id, puzzle_id),
            with: {
              redirects: {
                columns: { slug: true, created_at: true },
                orderBy: (tbl, { desc }) => desc(tbl.created_at)
              }
            }
          })
        );

        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_puzzle',
              message: 'Puzzle not found'
            })
          );
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
      })
    )
  );

const delete_redirect_slug_route = protectedAdminProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      redirect_slug: slug_schema
    })
  )
  .mutation(({ input: { puzzle_id, redirect_slug } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const puzzle = yield* dbRun('padavali.find_puzzle_for_redirect_delete', (client) =>
          client.query.padavali_puzzles.findFirst({
            columns: { id: true, slug: true },
            where: (tbl, { eq }) => eq(tbl.id, puzzle_id)
          })
        );
        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_puzzle',
              message: 'Puzzle not found'
            })
          );
        }
        if (puzzle.slug === redirect_slug) {
          return yield* Effect.fail(
            BadRequestError.make({
              message: 'Cannot delete the current slug'
            })
          );
        }

        const redirect = yield* dbRun('padavali.find_redirect_for_delete', (client) =>
          client.query.padavali_redirects.findFirst({
            columns: { id: true },
            where: (tbl, { and, eq }) =>
              and(eq(tbl.slug, redirect_slug), eq(tbl.puzzle_id, puzzle_id))
          })
        );
        if (!redirect) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_redirect',
              message: 'Redirect not found'
            })
          );
        }

        yield* dbRun('padavali.delete_redirect', async (client) => {
          await client
            .delete(padavali_redirects)
            .where(
              and(
                eq(padavali_redirects.id, redirect.id),
                eq(padavali_redirects.puzzle_id, puzzle_id)
              )
            );
        });

        yield* settle(CACHE.padavali.word_puzzle.delete({ slug: redirect_slug }));
        yield* settle(CACHE.padavali.word_meanings.delete({ slug: redirect_slug }));
        yield* Effect.sync(() => revalidatePath(`/padavali/${redirect_slug}`));

        return { success: true as const };
      })
    )
  );

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

import { catalog_list_filter_fields } from '~/util/catalog/tags';
import { Effect } from 'effect';
import { z } from 'zod';
import { protectedAdminProcedure, publicProcedure, t } from '~/api/trpc_init';
import { dbRunHttp, dbTransaction } from '~/effect/database';
import { padavali_puzzles, puzzle_redirects, puzzles, image_assets } from '~/db/schema';
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { padavali_stats_router } from './padavali_stats';
import {
  CACHE,
  invalidate_and_refresh_cache,
  invalidate_padavali_sitemap,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import {
  puzzle_add_input_schema,
  puzzle_update_input_schema,
  puzzle_update_slug_input_schema,
  slug_schema
} from '~/db/db_shared_vals';
import { insertWithUniqueUid } from '~/util/puzzle/nano_id';
import { createEmptyGridData, isValidSlug, normalizeSlug } from '~/util/puzzle/slug';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';
import {
  collectionsForPuzzleIds,
  catalogFilterConditions,
  tagsForPuzzleIds
} from '~/util/catalog/list_query';
import { syncPuzzleAttachments } from '~/game_shell/attachments';
import { createGameSlugHelpers } from '~/game_shell/slug';
import { refreshPuzzleSlugMap } from '~/util/cache.server/puzzle_slug_map_cache';
import { BadRequestError, NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import { padavaliActiveWordsEqual } from '~/util/puzzle/word_list';

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.catch(() => Effect.void));

const slugHelpers = createGameSlugHelpers({
  kind: 'padavali',
  isValidSlug
});

const padavaliKind = eq(puzzles.kind, 'padavali');

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

const check_slug_availability_route = protectedAdminProcedure
  .input(
    z.object({
      slug: z.string(),
      exclude_puzzle_id: z.number().int().optional()
    })
  )
  .query(({ input: { slug, exclude_puzzle_id } }) =>
    runTrpcEffect(slugHelpers.resolve_slug_availability(slug, { exclude_puzzle_id }))
  );

const update_puzzle_route = protectedAdminProcedure
  .input(puzzle_update_input_schema)
  .mutation(({ input: { puzzle_id, puzzle_data, puzzle_slug, image_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const [existingRow] = yield* dbRunHttp('padavali.find_puzzle_for_update', (client) =>
          client
            .select({
              listed: puzzles.listed,
              title: puzzles.title,
              description: puzzles.description,
              word_list: padavali_puzzles.word_list
            })
            .from(puzzles)
            .innerJoin(padavali_puzzles, eq(padavali_puzzles.id, puzzles.id))
            .where(and(padavaliKind, eq(puzzles.id, puzzle_id), eq(puzzles.slug, puzzle_slug)))
            .limit(1)
        );
        const existing = existingRow;
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
          !padavaliActiveWordsEqual(existing.word_list, puzzle_data.word_list);

        const { updated_count, newly_added_index_ids } = yield* dbTransaction(
          'padavali.update_puzzle',
          async (tx) => {
            const metaUpdates: Partial<typeof puzzles.$inferInsert> = {
              title: puzzle_data_rest.title,
              description: puzzle_data_rest.description,
              listed: puzzle_data_rest.listed,
              image_id
            };
            if (!prev_listed && puzzle_data.listed) {
              metaUpdates.last_listed_at = new Date();
            }

            const updated = await tx
              .update(puzzles)
              .set(metaUpdates)
              .where(and(padavaliKind, eq(puzzles.id, puzzle_id), eq(puzzles.slug, puzzle_slug)))
              .returning();

            if (updated.length > 0) {
              const grid_data = puzzle_data_rest.grid_data;
              const grid_dimensions: [number, number] = [
                grid_data.length,
                grid_data[0]?.length ?? 0
              ];
              await tx
                .update(padavali_puzzles)
                .set({
                  word_list: puzzle_data_rest.word_list,
                  grid_data,
                  grid_dimensions
                })
                .where(eq(padavali_puzzles.id, puzzle_id));
            }

            const attachment_result = await syncPuzzleAttachments(tx, puzzle_id, attachments);
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
          yield* settle(invalidate_padavali_sitemap());
        }
        yield* settle(
          invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS)
        );
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

        const [puzzle] = yield* dbRunHttp('padavali.find_puzzle_for_slug_update', (client) =>
          client
            .select({ id: puzzles.id, listed: puzzles.listed })
            .from(puzzles)
            .where(and(padavaliKind, eq(puzzles.id, puzzle_id), eq(puzzles.slug, current_slug)))
            .limit(1)
        );
        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_puzzle',
              message: 'Puzzle not found or slug mismatch'
            })
          );
        }

        yield* slugHelpers.assert_slug_usable_for_mutation(new_slug, {
          exclude_puzzle_id: puzzle_id,
          override_redirect_slug
        });

        const updated_count = yield* dbTransaction('padavali.update_puzzle_slug', async (tx) => {
          await slugHelpers.delete_redirect_for_slug(tx, new_slug);

          const updated = await tx
            .update(puzzles)
            .set({ slug: new_slug })
            .where(and(padavaliKind, eq(puzzles.id, puzzle_id), eq(puzzles.slug, current_slug)))
            .returning();

          if (updated.length > 0) {
            await slugHelpers.upsert_redirect_for_puzzle(tx, puzzle_id, current_slug);
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
          yield* settle(invalidate_padavali_sitemap());
        }
        yield* settle(
          invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS)
        );
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

        yield* settle(refreshPuzzleSlugMap());

        return { success: true as const, slug: new_slug };
      })
    )
  );

const add_puzzle_route = protectedAdminProcedure
  .input(puzzle_add_input_schema)
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* slugHelpers.assert_slug_usable_for_mutation(input.slug, {
          override_redirect_slug: input.override_redirect_slug
        });

        const inserted_puzzles = yield* dbTransaction('padavali.insert_puzzle', async (tx) => {
          if (input.override_redirect_slug) {
            await slugHelpers.delete_redirect_for_slug(tx, input.slug);
          }

          return insertWithUniqueUid(tx, puzzles, async (scoped, uid) => {
            const [inserted] = await scoped
              .insert(puzzles)
              .values({
                kind: 'padavali',
                uid,
                title: input.title,
                slug: input.slug,
                description: input.description?.trim() ?? '',
                listed: false
              })
              .returning();
            if (!inserted) return [];
            await scoped.insert(padavali_puzzles).values({
              id: inserted.id,
              word_list: [],
              grid_data: createEmptyGridData(input.grid_dimensions),
              grid_dimensions: input.grid_dimensions
            });
            return [inserted];
          });
        });
        const inserted = inserted_puzzles[0];
        if (!inserted) {
          throw new Error('Failed to create puzzle');
        }

        yield* settle(refreshPuzzleSlugMap());

        return { id: inserted.id };
      })
    )
  );

const delete_puzzle_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int(), slug: z.string() }))
  .mutation(({ input: { id, slug } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const normalizedSlug = normalizeSlug(slug);
        const [puzzle] = yield* dbRunHttp('padavali.find_puzzle_for_delete', (client) =>
          client
            .select({ listed: puzzles.listed })
            .from(puzzles)
            .where(and(padavaliKind, eq(puzzles.id, id), eq(puzzles.slug, normalizedSlug)))
            .limit(1)
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
            .delete(puzzles)
            .where(and(padavaliKind, eq(puzzles.id, id), eq(puzzles.slug, normalizedSlug)));
        });

        if (listed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.padavali.listed_puzzle_list, NO_CACHE_PARAMS)
          );
          yield* settle(invalidate_padavali_sitemap());
        }
        yield* settle(
          invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS)
        );
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
        yield* settle(refreshPuzzleSlugMap());
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
  order_by: z.enum(['asc', 'desc']).optional().default('desc'),
  ...catalog_list_filter_fields
});

export const get_puzzle_list_page = Effect.fn('padavali.get_puzzle_list_page')(function* (
  input: z.input<typeof get_puzzle_list_input_schema>
) {
  const { page, size, search_title, listed_filter, sort_by, order_by, tag_slugs, collection_ids } =
    get_puzzle_list_input_schema.parse(input);

  const trimmedSearch = search_title?.trim();
  const conditions = [padavaliKind];
  if (listed_filter !== undefined) {
    conditions.push(eq(puzzles.listed, listed_filter));
  }
  if (trimmedSearch) {
    for (const token of tokenizeSearchQuery(trimmedSearch)) {
      const pattern = `%${escapeIlikeToken(token)}%`;
      conditions.push(or(ilike(puzzles.title, pattern), ilike(puzzles.description, pattern))!);
    }
  }
  conditions.push(
    ...catalogFilterConditions(puzzles.id, 'padavali', { tag_slugs, collection_ids })
  );
  const whereClause = and(...conditions);

  const sortCol =
    sort_by === 'updated_at'
      ? sql`coalesce(${puzzles.updated_at}, ${puzzles.created_at})`
      : puzzles.created_at;
  const orderPrimary = order_by === 'desc' ? desc(sortCol) : asc(sortCol);
  const orderTiebreaker = order_by === 'desc' ? desc(puzzles.id) : asc(puzzles.id);
  const offset = (page - 1) * size;

  const { countResult, rows } = yield* Effect.all({
    countResult: dbRunHttp('padavali.count_puzzle_list_page', (client) =>
      client
        .select({ count: count() })
        .from(puzzles)
        .innerJoin(padavali_puzzles, eq(padavali_puzzles.id, puzzles.id))
        .where(whereClause)
    ),
    rows: dbRunHttp('padavali.select_puzzle_list_page', (client) =>
      client
        .select({
          id: puzzles.id,
          uid: puzzles.uid,
          slug: puzzles.slug,
          title: puzzles.title,
          description: puzzles.description,
          listed: puzzles.listed,
          created_at: puzzles.created_at,
          updated_at: puzzles.updated_at,
          image_s3_key: image_assets.s3_key
        })
        .from(puzzles)
        .innerJoin(padavali_puzzles, eq(padavali_puzzles.id, puzzles.id))
        .leftJoin(image_assets, eq(puzzles.image_id, image_assets.id))
        .where(whereClause)
        .orderBy(orderPrimary, orderTiebreaker)
        .limit(size)
        .offset(offset)
    )
  });

  const puzzleIds = rows.map((row) => row.id);
  const { tagsByPuzzle, collectionsByPuzzle } = yield* Effect.all({
    tagsByPuzzle: tagsForPuzzleIds('padavali', puzzleIds),
    collectionsByPuzzle: collectionsForPuzzleIds('padavali', puzzleIds)
  });
  const list = rows.map(({ image_s3_key, ...puzzle }) => ({
    ...puzzle,
    image: image_s3_key ? { s3_key: image_s3_key } : null,
    tags: tagsByPuzzle.get(puzzle.id) ?? [],
    collections: collectionsByPuzzle.get(puzzle.id) ?? []
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

const get_puzzle_slugs_route = protectedAdminProcedure
  .input(z.object({ puzzle_id: z.number().int() }))
  .query(({ input: { puzzle_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const [puzzle] = yield* dbRunHttp('padavali.get_puzzle_slugs', (client) =>
          client
            .select({ slug: puzzles.slug })
            .from(puzzles)
            .where(and(padavaliKind, eq(puzzles.id, puzzle_id)))
            .limit(1)
        );
        const redirects = yield* dbRunHttp('padavali.get_puzzle_redirects', (client) =>
          client
            .select({ slug: puzzle_redirects.slug, created_at: puzzle_redirects.created_at })
            .from(puzzle_redirects)
            .where(
              and(eq(puzzle_redirects.kind, 'padavali'), eq(puzzle_redirects.puzzle_id, puzzle_id))
            )
            .orderBy(desc(puzzle_redirects.created_at))
        );

        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_puzzle',
              message: 'Puzzle not found'
            })
          );
        }

        const redirect_slugs = redirects.map((redirect) => redirect.slug);
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
        const [puzzle] = yield* dbRunHttp('padavali.find_puzzle_for_redirect_delete', (client) =>
          client
            .select({ id: puzzles.id, slug: puzzles.slug })
            .from(puzzles)
            .where(and(padavaliKind, eq(puzzles.id, puzzle_id)))
            .limit(1)
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

        const [redirect] = yield* dbRunHttp('padavali.find_redirect_for_delete', (client) =>
          client
            .select({ id: puzzle_redirects.id })
            .from(puzzle_redirects)
            .where(
              and(
                eq(puzzle_redirects.kind, 'padavali'),
                eq(puzzle_redirects.slug, redirect_slug),
                eq(puzzle_redirects.puzzle_id, puzzle_id)
              )
            )
            .limit(1)
        );
        if (!redirect) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_redirect',
              message: 'Redirect not found'
            })
          );
        }

        yield* dbRunHttp('padavali.delete_redirect', async (client) => {
          await client
            .delete(puzzle_redirects)
            .where(
              and(eq(puzzle_redirects.id, redirect.id), eq(puzzle_redirects.puzzle_id, puzzle_id))
            );
        });

        yield* settle(CACHE.padavali.word_puzzle.delete({ slug: redirect_slug }));
        yield* settle(CACHE.padavali.word_meanings.delete({ slug: redirect_slug }));
        yield* settle(refreshPuzzleSlugMap());

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
  get_puzzle_slugs: get_puzzle_slugs_route,
  delete_redirect_slug: delete_redirect_slug_route
});

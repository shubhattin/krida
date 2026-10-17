import { Effect } from 'effect';
import { z } from 'zod';
import { protectedAdminProcedure, publicProcedure, t } from '../../trpc_init';
import { dbRunHttp, dbTransaction } from '~/effect/database';
import {
  crossword_puzzles,
  image_assets,
  puzzle_attachments,
  puzzle_redirects,
  puzzles
} from '~/db/schema';
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';
import { puzzleHasTag, puzzleInCollection, tagsForPuzzleIds } from '~/util/catalog/list_query';
import { createEmptyGridData } from '~/util/cross_word/grid';
import { analyzeWordPlacements, resolveWordListForSave } from '~/util/cross_word/placement';
import {
  crossword_add_input_schema,
  crossword_list_input_schema,
  crossword_update_input_schema,
  crossword_update_slug_input_schema
} from '~/db/crossword_shared';
import { insertWithUniqueUid } from '~/util/puzzle/nano_id';
import { crossword_slug_schema } from '~/util/puzzle/slug';
import {
  CACHE,
  invalidate_and_refresh_cache,
  invalidate_padajala_sitemap,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { normalizeSlug } from '~/util/puzzle/slug';
import {
  assert_slug_usable_for_mutation,
  delete_redirect_for_slug,
  resolve_slug_availability,
  upsert_redirect_for_puzzle
} from './slug_helpers';
import { crossword_stats_router } from './crossword_stats';
import { crossword_schedules_router } from './crossword_schedules';
import { more_hints_inputs_equal } from '~/util/ai/more_hints';
import { syncPuzzleAttachments } from '~/game_shell/attachments';
import { BadRequestError, NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.catch(() => Effect.void));

const crosswordKind = eq(puzzles.kind, 'crossword');

const puzzle_in_current_schedule = Effect.fn('crossword.puzzle_in_current_schedule')(function* (
  id: number
) {
  const current_schedule = yield* CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS);
  return current_schedule?.puzzle.id === id;
});

const puzzle_in_next_schedule = Effect.fn('crossword.puzzle_in_next_schedule')(function* (
  id: number
) {
  const next_schedule = yield* CACHE.crossword.next_schedule.get(NO_CACHE_PARAMS);
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
    runTrpcEffect(resolve_slug_availability(slug, { exclude_puzzle_id }))
  );

const get_listed_puzzles_route = publicProcedure.query(() =>
  runTrpcEffect(CACHE.crossword.listed_puzzle_list.get(NO_CACHE_PARAMS))
);

const get_puzzle_by_id_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int() }))
  .query(({ input: { id } }) =>
    runTrpcEffect(
      dbRunHttp('crossword.get_puzzle_by_id', async (client) => {
        const [puzzle] = await client
          .select({
            id: puzzles.id,
            uid: puzzles.uid,
            slug: puzzles.slug,
            title: puzzles.title,
            description: puzzles.description,
            listed: puzzles.listed,
            created_at: puzzles.created_at,
            updated_at: puzzles.updated_at,
            grid_dimensions: crossword_puzzles.grid_dimensions,
            grid_data: crossword_puzzles.grid_data,
            word_list: crossword_puzzles.word_list,
            image_id: image_assets.id,
            image_s3_key: image_assets.s3_key,
            image_width: image_assets.width,
            image_height: image_assets.height
          })
          .from(puzzles)
          .innerJoin(crossword_puzzles, eq(crossword_puzzles.id, puzzles.id))
          .leftJoin(image_assets, eq(image_assets.id, puzzles.image_id))
          .where(and(crosswordKind, eq(puzzles.id, id)))
          .limit(1);
        if (!puzzle) return undefined;
        const attachments = await client
          .select({
            id: puzzle_attachments.id,
            title: puzzle_attachments.title,
            type: puzzle_attachments.type,
            url: puzzle_attachments.url,
            order_index: puzzle_attachments.order_index
          })
          .from(puzzle_attachments)
          .where(eq(puzzle_attachments.puzzle_id, puzzle.id))
          .orderBy(asc(puzzle_attachments.order_index));
        const { image_id, image_s3_key, image_width, image_height, ...rest } = puzzle;
        return {
          ...rest,
          attachments,
          image:
            image_id && image_s3_key
              ? { id: image_id, s3_key: image_s3_key, width: image_width!, height: image_height! }
              : null
        };
      })
    )
  );

const get_puzzle_list_page_route = protectedAdminProcedure
  .input(crossword_list_input_schema)
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const {
          page,
          size,
          search_title,
          listed_filter,
          sort_by,
          order_by,
          tag_slug,
          collection_id
        } = crossword_list_input_schema.parse(input);

        const trimmedSearch = search_title?.trim();
        const conditions = [crosswordKind];
        if (listed_filter !== undefined) {
          conditions.push(eq(puzzles.listed, listed_filter));
        }
        if (trimmedSearch) {
          for (const token of tokenizeSearchQuery(trimmedSearch)) {
            const pattern = `%${escapeIlikeToken(token)}%`;
            conditions.push(
              or(ilike(puzzles.title, pattern), ilike(puzzles.description, pattern))!
            );
          }
        }
        if (tag_slug) conditions.push(puzzleHasTag(puzzles.id, 'crossword', tag_slug));
        if (collection_id !== undefined) {
          conditions.push(puzzleInCollection(puzzles.id, 'crossword', collection_id));
        }
        const whereClause = and(...conditions);

        const sortCol =
          sort_by === 'updated_at'
            ? sql`coalesce(${puzzles.updated_at}, ${puzzles.created_at})`
            : puzzles.created_at;
        const orderPrimary = order_by === 'desc' ? desc(sortCol) : asc(sortCol);
        const orderTiebreaker = order_by === 'desc' ? desc(puzzles.id) : asc(puzzles.id);
        const offset = (page - 1) * size;

        const { countResult, rows } = yield* Effect.all({
          countResult: dbRunHttp('crossword.count_puzzle_list_page', (client) =>
            client
              .select({ count: count() })
              .from(puzzles)
              .innerJoin(crossword_puzzles, eq(crossword_puzzles.id, puzzles.id))
              .where(whereClause)
          ),
          rows: dbRunHttp('crossword.select_puzzle_list_page', (client) =>
            client
              .select({
                id: puzzles.id,
                uid: puzzles.uid,
                slug: puzzles.slug,
                title: puzzles.title,
                description: puzzles.description,
                listed: puzzles.listed,
                grid_dimensions: crossword_puzzles.grid_dimensions,
                created_at: puzzles.created_at,
                updated_at: puzzles.updated_at,
                image_s3_key: image_assets.s3_key
              })
              .from(puzzles)
              .innerJoin(crossword_puzzles, eq(crossword_puzzles.id, puzzles.id))
              .leftJoin(image_assets, eq(puzzles.image_id, image_assets.id))
              .where(whereClause)
              .orderBy(orderPrimary, orderTiebreaker)
              .limit(size)
              .offset(offset)
          )
        });

        const tagsByPuzzle = yield* tagsForPuzzleIds(
          'crossword',
          rows.map((row) => row.id)
        );
        const list = rows.map(({ image_s3_key, ...puzzle }) => ({
          ...puzzle,
          image: image_s3_key ? { s3_key: image_s3_key } : null,
          tags: tagsByPuzzle.get(puzzle.id) ?? []
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
      })
    )
  );

const add_puzzle_route = protectedAdminProcedure
  .input(crossword_add_input_schema)
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* assert_slug_usable_for_mutation(input.slug, {
          override_redirect_slug: input.override_redirect_slug
        });

        const dimensions = input.grid_dimensions;
        const inserted_puzzles = yield* dbTransaction('crossword.insert_puzzle', async (tx) => {
          if (input.override_redirect_slug) {
            await delete_redirect_for_slug(tx, input.slug);
          }

          return insertWithUniqueUid(tx, puzzles, async (scoped, uid) => {
            const [inserted] = await scoped
              .insert(puzzles)
              .values({
                kind: 'crossword',
                uid,
                slug: input.slug,
                title: input.title.trim(),
                description: input.description?.trim() ?? '',
                listed: false
              })
              .returning();
            if (!inserted) return [];
            await scoped.insert(crossword_puzzles).values({
              id: inserted.id,
              grid_dimensions: dimensions,
              grid_data: createEmptyGridData(dimensions),
              word_list: []
            });
            return [inserted];
          });
        });
        const inserted = inserted_puzzles[0];
        if (!inserted) {
          throw new Error('Failed to create puzzle');
        }

        yield* settle(
          invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS)
        );
        return { id: inserted.id };
      })
    )
  );

const update_puzzle_route = protectedAdminProcedure
  .input(crossword_update_input_schema)
  .mutation(({ input: { puzzle_id, puzzle_data, puzzle_slug, image_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const [existing] = yield* dbRunHttp('crossword.find_puzzle_for_update', (client) =>
          client
            .select({
              id: puzzles.id,
              listed: puzzles.listed,
              title: puzzles.title,
              description: puzzles.description,
              word_list: crossword_puzzles.word_list
            })
            .from(puzzles)
            .innerJoin(crossword_puzzles, eq(crossword_puzzles.id, puzzles.id))
            .where(
              and(crosswordKind, eq(puzzles.id, puzzle_id), eq(puzzles.slug, puzzle_slug))
            )
            .limit(1)
        );
        if (!existing) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_puzzle',
              message: 'Puzzle not found or slug mismatch'
            })
          );
        }

        const resolvedWordList = resolveWordListForSave(
          puzzle_data.grid_data,
          puzzle_data.word_list
        );
        const analysis = analyzeWordPlacements(puzzle_data.grid_data, puzzle_data.word_list);

        if (puzzle_data.listed && !analysis.canList) {
          return yield* Effect.fail(
            BadRequestError.make({
              message:
                'Cannot list puzzle until every word has exactly one valid placement on the grid'
            })
          );
        }

        const prev_listed = existing.listed;
        const { attachments, ...puzzle_data_rest } = puzzle_data;
        const becomingListed = puzzle_data.listed && !prev_listed;
        const more_hints_input_changed = !more_hints_inputs_equal(
          {
            title: existing.title,
            description: existing.description,
            word_list: existing.word_list
          },
          {
            title: puzzle_data.title,
            description: puzzle_data.description,
            word_list: resolvedWordList
          }
        );

        const { updated_count, newly_added_index_ids } = yield* dbTransaction(
          'crossword.update_puzzle',
          async (tx) => {
            const metaUpdates: Partial<typeof puzzles.$inferInsert> = {
              title: puzzle_data_rest.title,
              description: puzzle_data_rest.description,
              listed: puzzle_data_rest.listed,
              image_id
            };
            if (becomingListed) metaUpdates.last_listed_at = new Date();

            const updated = await tx
              .update(puzzles)
              .set(metaUpdates)
              .where(
                and(crosswordKind, eq(puzzles.id, puzzle_id), eq(puzzles.slug, puzzle_slug))
              )
              .returning();

            if (updated.length > 0) {
              await tx
                .update(crossword_puzzles)
                .set({
                  grid_data: puzzle_data_rest.grid_data,
                  grid_dimensions: puzzle_data_rest.grid_dimensions,
                  word_list: resolvedWordList
                })
                .where(eq(crossword_puzzles.id, puzzle_id));
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
              resource: 'crossword_puzzle',
              message: 'Puzzle not found or slug mismatch'
            })
          );
        }

        if (puzzle_data.listed || prev_listed !== puzzle_data.listed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS)
          );
          yield* settle(invalidate_padajala_sitemap());
        }
        yield* settle(
          invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS)
        );
        yield* settle(
          invalidate_and_refresh_cache(CACHE.crossword.word_puzzle, { slug: puzzle_slug })
        );
        if (more_hints_input_changed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.more_hints, { slug: puzzle_slug })
          );
        }
        if (yield* puzzle_in_current_schedule(puzzle_id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.current_schedule, NO_CACHE_PARAMS)
          );
        }
        if (yield* puzzle_in_next_schedule(puzzle_id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.next_schedule, NO_CACHE_PARAMS)
          );
        }

        return { success: true as const, newly_added_index_ids };
      })
    )
  );

const update_puzzle_slug_route = protectedAdminProcedure
  .input(crossword_update_slug_input_schema)
  .mutation(({ input: { puzzle_id, current_slug, new_slug, override_redirect_slug } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        if (current_slug === new_slug) {
          return { success: true as const, slug: new_slug };
        }

        const [puzzle] = yield* dbRunHttp('crossword.find_puzzle_for_slug_update', (client) =>
          client
            .select({ id: puzzles.id, listed: puzzles.listed })
            .from(puzzles)
            .where(
              and(crosswordKind, eq(puzzles.id, puzzle_id), eq(puzzles.slug, current_slug))
            )
            .limit(1)
        );
        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_puzzle',
              message: 'Puzzle not found or slug mismatch'
            })
          );
        }

        yield* assert_slug_usable_for_mutation(new_slug, {
          exclude_puzzle_id: puzzle_id,
          override_redirect_slug
        });

        const updated_count = yield* dbTransaction('crossword.update_puzzle_slug', async (tx) => {
          await delete_redirect_for_slug(tx, new_slug);

          const updated = await tx
            .update(puzzles)
            .set({ slug: new_slug })
            .where(
              and(crosswordKind, eq(puzzles.id, puzzle_id), eq(puzzles.slug, current_slug))
            )
            .returning();

          if (updated.length > 0) {
            await upsert_redirect_for_puzzle(tx, puzzle_id, current_slug);
          }

          return updated.length;
        });

        if (updated_count === 0) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_puzzle',
              message: 'Puzzle not found or slug mismatch'
            })
          );
        }

        yield* settle(
          invalidate_and_refresh_cache(CACHE.crossword.word_puzzle, { slug: new_slug })
        );
        yield* settle(CACHE.crossword.word_puzzle.delete({ slug: current_slug }));
        yield* settle(invalidate_and_refresh_cache(CACHE.crossword.more_hints, { slug: new_slug }));
        yield* settle(CACHE.crossword.more_hints.delete({ slug: current_slug }));

        if (puzzle.listed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS)
          );
          yield* settle(invalidate_padajala_sitemap());
        }
        yield* settle(
          invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS)
        );
        if (yield* puzzle_in_current_schedule(puzzle_id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.current_schedule, NO_CACHE_PARAMS)
          );
        }
        if (yield* puzzle_in_next_schedule(puzzle_id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.next_schedule, NO_CACHE_PARAMS)
          );
        }

        return { success: true as const, slug: new_slug };
      })
    )
  );

const set_listed_route = protectedAdminProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      listed: z.boolean()
    })
  )
  .mutation(({ input: { puzzle_id, listed } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const [existing] = yield* dbRunHttp('crossword.find_puzzle_for_set_listed', (client) =>
          client
            .select({
              id: puzzles.id,
              slug: puzzles.slug,
              listed: puzzles.listed,
              grid_data: crossword_puzzles.grid_data,
              word_list: crossword_puzzles.word_list
            })
            .from(puzzles)
            .innerJoin(crossword_puzzles, eq(crossword_puzzles.id, puzzles.id))
            .where(and(crosswordKind, eq(puzzles.id, puzzle_id)))
            .limit(1)
        );
        if (!existing) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_puzzle',
              message: 'Puzzle not found'
            })
          );
        }

        if (listed) {
          const analysis = analyzeWordPlacements(existing.grid_data, existing.word_list);
          if (!analysis.canList) {
            return yield* Effect.fail(
              BadRequestError.make({
                message:
                  'Cannot list puzzle until every word has exactly one valid placement on the grid'
              })
            );
          }
        }

        const becomingListed = listed && !existing.listed;

        const updates: Partial<typeof puzzles.$inferInsert> = { listed };
        if (becomingListed) updates.last_listed_at = new Date();

        yield* dbRunHttp('crossword.set_listed', async (client) => {
          await client
            .update(puzzles)
            .set(updates)
            .where(and(crosswordKind, eq(puzzles.id, puzzle_id)));
        });

        yield* invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS);
        yield* invalidate_and_refresh_cache(CACHE.crossword.word_puzzle, { slug: existing.slug });
        yield* settle(
          invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS)
        );
        yield* invalidate_padajala_sitemap();
        return { success: true as const };
      })
    )
  );

const delete_puzzle_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int(), slug: z.string() }))
  .mutation(({ input: { id, slug } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const normalizedSlug = normalizeSlug(slug);
        const [puzzle] = yield* dbRunHttp('crossword.find_puzzle_for_delete', (client) =>
          client
            .select({ listed: puzzles.listed })
            .from(puzzles)
            .where(and(crosswordKind, eq(puzzles.id, id), eq(puzzles.slug, normalizedSlug)))
            .limit(1)
        );
        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_puzzle',
              message: 'Puzzle not found'
            })
          );
        }

        yield* dbTransaction('crossword.delete_puzzle', async (tx) => {
          await tx
            .delete(puzzles)
            .where(and(crosswordKind, eq(puzzles.id, id), eq(puzzles.slug, normalizedSlug)));
        });

        if (puzzle.listed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS)
          );
          yield* settle(invalidate_padajala_sitemap());
        }
        yield* settle(
          invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS)
        );
        yield* settle(
          invalidate_and_refresh_cache(CACHE.crossword.word_puzzle, { slug: normalizedSlug })
        );
        yield* settle(CACHE.crossword.more_hints.delete({ slug: normalizedSlug }));
        if (yield* puzzle_in_current_schedule(id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.current_schedule, NO_CACHE_PARAMS)
          );
        }
        if (yield* puzzle_in_next_schedule(id)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.next_schedule, NO_CACHE_PARAMS)
          );
        }

        return { success: true };
      })
    )
  );

const get_puzzle_slugs_route = protectedAdminProcedure
  .input(z.object({ puzzle_id: z.number().int() }))
  .query(({ input: { puzzle_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const [puzzle] = yield* dbRunHttp('crossword.get_puzzle_slugs', (client) =>
          client
            .select({ slug: puzzles.slug })
            .from(puzzles)
            .where(and(crosswordKind, eq(puzzles.id, puzzle_id)))
            .limit(1)
        );
        const redirects = yield* dbRunHttp('crossword.get_puzzle_redirects', (client) =>
          client
            .select({ slug: puzzle_redirects.slug, created_at: puzzle_redirects.created_at })
            .from(puzzle_redirects)
            .where(
              and(eq(puzzle_redirects.kind, 'crossword'), eq(puzzle_redirects.puzzle_id, puzzle_id))
            )
            .orderBy(desc(puzzle_redirects.created_at))
        );

        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_puzzle',
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
      redirect_slug: crossword_slug_schema
    })
  )
  .mutation(({ input: { puzzle_id, redirect_slug } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const [puzzle] = yield* dbRunHttp('crossword.find_puzzle_for_redirect_delete', (client) =>
          client
            .select({ id: puzzles.id, slug: puzzles.slug })
            .from(puzzles)
            .where(and(crosswordKind, eq(puzzles.id, puzzle_id)))
            .limit(1)
        );
        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_puzzle',
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

        const [redirect] = yield* dbRunHttp('crossword.find_redirect_for_delete', (client) =>
          client
            .select({ id: puzzle_redirects.id })
            .from(puzzle_redirects)
            .where(
              and(
                eq(puzzle_redirects.kind, 'crossword'),
                eq(puzzle_redirects.slug, redirect_slug),
                eq(puzzle_redirects.puzzle_id, puzzle_id)
              )
            )
            .limit(1)
        );
        if (!redirect) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_redirect',
              message: 'Redirect not found'
            })
          );
        }

        yield* dbRunHttp('crossword.delete_redirect', async (client) => {
          await client
            .delete(puzzle_redirects)
            .where(
              and(eq(puzzle_redirects.id, redirect.id), eq(puzzle_redirects.puzzle_id, puzzle_id))
            );
        });

        yield* settle(CACHE.crossword.word_puzzle.delete({ slug: redirect_slug }));
        yield* settle(CACHE.crossword.more_hints.delete({ slug: redirect_slug }));

        return { success: true as const };
      })
    )
  );

/** Public: waiting-room UI refreshes schedule cache when countdown ends. */
const refresh_current_schedule_route = publicProcedure.mutation(() =>
  runTrpcEffect(
    Effect.gen(function* () {
      yield* invalidate_and_refresh_cache(CACHE.crossword.current_schedule, NO_CACHE_PARAMS);
      yield* invalidate_and_refresh_cache(CACHE.crossword.next_schedule, NO_CACHE_PARAMS);
      const current = yield* CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS);
      return { has_current: current !== undefined };
    })
  )
);

/** Same cap as padavali `get_listed_puzzles_preview`. */
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
        const listed = yield* CACHE.crossword.listed_puzzle_list.get(NO_CACHE_PARAMS);
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

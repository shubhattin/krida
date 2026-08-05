import { Effect } from 'effect';
import { z } from 'zod';
import { protectedAdminProcedure, publicProcedure, t } from '../../trpc_init';
import { dbRun, dbTransaction, type DbTransaction } from '~/effect/database';
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
  invalidate_and_refresh_cache,
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
import { more_hints_inputs_equal } from '~/util/ai/more_hints';
import { BadRequestError, NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import { crosswordActiveWordList } from '~/util/puzzle/word_list';

type AttachmentInput = z.infer<typeof CrosswordUpdateInputSchema>['puzzle_data']['attachments'];

const revalidateCrosswordPaths = (slug?: string) => {
  revalidatePath('/padajala');
  revalidatePath('/padajala/puzzles');
  revalidatePath('/padajala/list');
  if (slug) {
    revalidatePath(`/padajala/${slug}`);
  }
};

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.catch(() => Effect.void));

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

const update_puzzle_attachments = async (
  tx: DbTransaction,
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
  .query(({ input: { slug, exclude_puzzle_id } }) =>
    runTrpcEffect(resolve_slug_availability(slug, { exclude_puzzle_id }))
  );

const get_listed_puzzles_route = publicProcedure.query(() =>
  runTrpcEffect(
    dbRun('crossword.listed_puzzles', (client) =>
      client
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
        .orderBy(desc(crossword_puzzles.last_listed_at), desc(crossword_puzzles.created_at))
    ).pipe(
      Effect.map((rows) =>
        rows.map((row) =>
          CrossordPuzzleSchemaZod.parse({
            ...row,
            word_list: crosswordActiveWordList(row.word_list)
          })
        )
      )
    )
  )
);

const get_puzzle_by_id_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int() }))
  .query(({ input: { id } }) =>
    runTrpcEffect(
      dbRun('crossword.get_puzzle_by_id', (client) =>
        client.query.crossword_puzzles.findFirst({
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
        })
      )
    )
  );

const get_puzzle_list_page_route = protectedAdminProcedure
  .input(crossword_list_input_schema)
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
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

        const { countResult, rows } = yield* Effect.all({
          countResult: dbRun('crossword.count_puzzle_list_page', (client) =>
            client.select({ count: count() }).from(crossword_puzzles).where(whereClause)
          ),
          rows: dbRun('crossword.select_puzzle_list_page', (client) =>
            client
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
      })
    )
  );

const add_puzzle_route = protectedAdminProcedure
  .input(crossword_add_input_schema)
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* Effect.sync(() => revalidateCrosswordPaths());

        yield* assert_slug_usable_for_mutation(input.slug, {
          override_redirect_slug: input.override_redirect_slug
        });

        const dimensions = input.grid_dimensions;
        const inserted_puzzles = yield* dbTransaction('crossword.insert_puzzle', async (tx) => {
          if (input.override_redirect_slug) {
            await delete_redirect_for_slug(tx, input.slug);
          }

          return tx
            .insert(crossword_puzzles)
            .values({
              slug: input.slug,
              title: input.title.trim(),
              description: input.description?.trim() ?? '',
              grid_dimensions: dimensions,
              grid_data: createEmptyGridData(dimensions),
              word_list: [],
              listed: false
            })
            .returning();
        });
        const inserted = inserted_puzzles[0];
        if (!inserted) {
          throw new Error('Failed to create puzzle');
        }

        yield* settle(
          invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS)
        );
        yield* Effect.sync(() => revalidatePath(`/padajala/edit/${inserted.id}`));
        return { id: inserted.id };
      })
    )
  );

const update_puzzle_route = protectedAdminProcedure
  .input(crossword_update_input_schema)
  .mutation(({ input: { puzzle_id, puzzle_data, puzzle_slug, image_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* Effect.sync(() => revalidateCrosswordPaths(puzzle_slug));

        const existing = yield* dbRun('crossword.find_puzzle_for_update', (client) =>
          client.query.crossword_puzzles.findFirst({
            columns: {
              id: true,
              listed: true,
              title: true,
              description: true,
              word_list: true
            },
            where: (tbl, { and: andFn, eq: eqFn }) =>
              andFn(eqFn(tbl.id, puzzle_id), eqFn(tbl.slug, puzzle_slug))
          })
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
            const updated = await tx
              .update(crossword_puzzles)
              .set({
                ...puzzle_data_rest,
                word_list: resolvedWordList,
                image_id,
                ...(becomingListed ? { last_listed_at: new Date() } : {})
              })
              .where(
                and(eq(crossword_puzzles.id, puzzle_id), eq(crossword_puzzles.slug, puzzle_slug))
              )
              .returning();

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
              resource: 'crossword_puzzle',
              message: 'Puzzle not found or slug mismatch'
            })
          );
        }

        if (puzzle_data.listed || prev_listed !== puzzle_data.listed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS)
          );
        }
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

        yield* Effect.sync(() => revalidatePath(`/padajala/edit/${puzzle_id}`));
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

        const puzzle = yield* dbRun('crossword.find_puzzle_for_slug_update', (client) =>
          client.query.crossword_puzzles.findFirst({
            columns: { id: true, listed: true },
            where: (tbl, { and: andFn, eq: eqFn }) =>
              andFn(eqFn(tbl.id, puzzle_id), eqFn(tbl.slug, current_slug))
          })
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
            .update(crossword_puzzles)
            .set({ slug: new_slug })
            .where(
              and(eq(crossword_puzzles.id, puzzle_id), eq(crossword_puzzles.slug, current_slug))
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

        yield* Effect.sync(() => {
          revalidateCrosswordPaths(new_slug);
          revalidateCrosswordPaths(current_slug);
        });

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

        yield* Effect.sync(() => revalidatePath(`/padajala/edit/${puzzle_id}`));
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
        const existing = yield* dbRun('crossword.find_puzzle_for_set_listed', (client) =>
          client.query.crossword_puzzles.findFirst({
            where: (tbl, { eq: eqFn }) => eqFn(tbl.id, puzzle_id)
          })
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

        yield* dbRun('crossword.set_listed', async (client) => {
          await client
            .update(crossword_puzzles)
            .set({
              listed,
              ...(becomingListed ? { last_listed_at: new Date() } : {})
            })
            .where(eq(crossword_puzzles.id, puzzle_id));
        });

        yield* Effect.sync(() => revalidateCrosswordPaths(existing.slug));
        yield* invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS);
        yield* invalidate_and_refresh_cache(CACHE.crossword.word_puzzle, { slug: existing.slug });
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
        const puzzle = yield* dbRun('crossword.find_puzzle_for_delete', (client) =>
          client.query.crossword_puzzles.findFirst({
            columns: { listed: true },
            where: (tbl, { and: andFn, eq: eqFn }) =>
              andFn(eqFn(tbl.id, id), eqFn(tbl.slug, normalizedSlug))
          })
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
            .delete(crossword_puzzles)
            .where(and(eq(crossword_puzzles.id, id), eq(crossword_puzzles.slug, normalizedSlug)));
        });

        yield* Effect.sync(() => {
          revalidateCrosswordPaths(normalizedSlug);
          revalidatePath(`/padajala/edit/${id}`);
        });

        if (puzzle.listed) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS)
          );
        }
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
        const puzzle = yield* dbRun('crossword.get_puzzle_slugs', (client) =>
          client.query.crossword_puzzles.findFirst({
            columns: { slug: true },
            where: (tbl, { eq: eqFn }) => eqFn(tbl.id, puzzle_id),
            with: {
              redirects: {
                columns: { slug: true, created_at: true },
                orderBy: (tbl, { desc: descFn }) => descFn(tbl.created_at)
              }
            }
          })
        );

        if (!puzzle) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_puzzle',
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
      redirect_slug: crossword_slug_schema
    })
  )
  .mutation(({ input: { puzzle_id, redirect_slug } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const puzzle = yield* dbRun('crossword.find_puzzle_for_redirect_delete', (client) =>
          client.query.crossword_puzzles.findFirst({
            columns: { id: true, slug: true },
            where: (tbl, { eq: eqFn }) => eqFn(tbl.id, puzzle_id)
          })
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

        const redirect = yield* dbRun('crossword.find_redirect_for_delete', (client) =>
          client.query.crossword_redirects.findFirst({
            columns: { id: true },
            where: (tbl, { and: andFn, eq: eqFn }) =>
              andFn(eqFn(tbl.slug, redirect_slug), eqFn(tbl.puzzle_id, puzzle_id))
          })
        );
        if (!redirect) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_redirect',
              message: 'Redirect not found'
            })
          );
        }

        yield* dbRun('crossword.delete_redirect', async (client) => {
          await client
            .delete(crossword_redirects)
            .where(
              and(
                eq(crossword_redirects.id, redirect.id),
                eq(crossword_redirects.puzzle_id, puzzle_id)
              )
            );
        });

        yield* settle(CACHE.crossword.word_puzzle.delete({ slug: redirect_slug }));
        yield* settle(CACHE.crossword.more_hints.delete({ slug: redirect_slug }));
        yield* Effect.sync(() => revalidatePath(`/padajala/${redirect_slug}`));

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

import { Effect } from 'effect';
import { z } from 'zod';
import { protectedAdminProcedure, publicProcedure, t } from '../../trpc_init';
import { dbRunHttp, dbTransaction, type DbTransaction } from '~/effect/database';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';
import { puzzleHasTag, puzzleInCollection, tagsForPuzzleIds } from '~/util/catalog/list_query';
import {
  simple_game_add_input_schema,
  simple_game_list_input_schema,
  simple_game_update_slug_input_schema,
  simpleGameUpdateInputSchema,
  type SimpleGameAttachmentInput
} from '~/db/simple_game_shared';
import { insertWithUniqueUid } from '~/util/puzzle/nano_id';
import { simple_game_slug_schema } from '~/util/puzzle/slug';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { normalizeSlug } from '~/util/puzzle/slug';
import { BadRequestError, NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import type { SimpleGameKind } from '~/util/games/kinds';
import type { SimpleGameTableSet } from '~/db/schema/simple_game_tables';
import type { GameAnalysis } from '~/util/games/issues';
import { createSimpleGameSlugHelpers } from './slug_helpers';
import { createSimpleGameStatsRouter } from './stats';

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.catch(() => Effect.void));

const LISTED_PUZZLES_PREVIEW_LIMIT = 16;

export function createSimpleGameRouter<TData>(options: {
  kind: SimpleGameKind;
  tables: SimpleGameTableSet<TData>;
  dataSchema: z.ZodType<TData>;
  emptyData: TData;
  infer: (data: TData) => TData;
  analyze: (data: TData) => GameAnalysis;
}) {
  const { kind, tables, dataSchema, emptyData, infer, analyze } = options;
  const updateSchema = simpleGameUpdateInputSchema(dataSchema);
  const slugHelpers = createSimpleGameSlugHelpers(kind, tables);
  const stats = createSimpleGameStatsRouter(kind, tables);

  const update_puzzle_attachments = async (
    tx: DbTransaction,
    puzzle_id: number,
    attachments: SimpleGameAttachmentInput[]
  ) => {
    const current_attachments = await tx
      .select({ id: tables.attachments.id })
      .from(tables.attachments)
      .where(eq(tables.attachments.puzzle_id, puzzle_id));
    const new_attachments = attachments
      .map((attachment, i) => ({ index: i, data: attachment }))
      .filter((attachment) => !attachment.data.id);
    const existing_attachments = attachments.filter((attachment) => attachment.id);
    const updated_attachments = existing_attachments.filter((attachment) =>
      current_attachments.some((row) => row.id === attachment.id)
    );
    const deleted_attachments = current_attachments.filter(
      (attachment) => !attachments.some((row) => row.id === attachment.id)
    );

    const update_existing =
      updated_attachments.length > 0
        ? (() => {
            const value_rows = updated_attachments.map(
              (attachment) =>
                sql`(${attachment.id!}::int, ${attachment.type}::attachment_type, ${attachment.url}::text, ${attachment.order_index}::smallint, ${attachment.title}::text)`
            );
            return tx.execute(sql`
              UPDATE ${tables.attachments} AS t
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
            .insert(tables.attachments)
            .values(
              new_attachments.map((attachment) => ({
                puzzle_id,
                type: attachment.data.type,
                url: attachment.data.url,
                order_index: attachment.data.order_index,
                title: attachment.data.title
              }))
            )
            .returning()
        : ([] as { id: number }[]),
      deleted_attachments.length > 0
        ? tx.delete(tables.attachments).where(
            and(
              eq(tables.attachments.puzzle_id, puzzle_id),
              inArray(
                tables.attachments.id,
                deleted_attachments.map((row) => row.id)
              )
            )
          )
        : Promise.resolve(),
      update_existing
    ]);

    return {
      newly_added_index_ids: new_attachments_inserted.map((row, i) => ({
        id: row.id,
        index: new_attachments[i]!.index
      }))
    };
  };

  const puzzleCache = CACHE[kind];

  const refreshListed = () =>
    settle(invalidate_and_refresh_cache(puzzleCache.listed_puzzle_list, NO_CACHE_PARAMS));
  const refreshPuzzle = (slug: string) =>
    settle(invalidate_and_refresh_cache(puzzleCache.word_puzzle, { slug }));
  const refreshCollections = () =>
    settle(invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS));

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

  const get_puzzle_by_id_route = protectedAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input: { id } }) =>
      runTrpcEffect(
        dbRunHttp(`${kind}.get_puzzle_by_id`, async (client) => {
          const [puzzle] = await client
            .select()
            .from(tables.puzzles)
            .where(eq(tables.puzzles.id, id))
            .limit(1);
          if (!puzzle) return undefined;
          const attachments = await client
            .select({
              id: tables.attachments.id,
              title: tables.attachments.title,
              type: tables.attachments.type,
              url: tables.attachments.url,
              order_index: tables.attachments.order_index
            })
            .from(tables.attachments)
            .where(eq(tables.attachments.puzzle_id, id))
            .orderBy(asc(tables.attachments.order_index));
          return { ...puzzle, attachments };
        })
      )
    );

  const get_puzzle_list_page_route = protectedAdminProcedure
    .input(simple_game_list_input_schema)
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
          } = simple_game_list_input_schema.parse(input);

          const trimmedSearch = search_title?.trim();
          const conditions = [];
          if (listed_filter !== undefined) {
            conditions.push(eq(tables.puzzles.listed, listed_filter));
          }
          if (trimmedSearch) {
            for (const token of tokenizeSearchQuery(trimmedSearch)) {
              const pattern = `%${escapeIlikeToken(token)}%`;
              conditions.push(
                or(ilike(tables.puzzles.title, pattern), ilike(tables.puzzles.description, pattern))!
              );
            }
          }
          if (tag_slug) conditions.push(puzzleHasTag(tables.puzzles.id, kind, tag_slug));
          if (collection_id !== undefined) {
            conditions.push(puzzleInCollection(tables.puzzles.id, kind, collection_id));
          }
          const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

          const sortCol =
            sort_by === 'updated_at'
              ? sql`coalesce(${tables.puzzles.updated_at}, ${tables.puzzles.created_at})`
              : tables.puzzles.created_at;
          const orderPrimary = order_by === 'desc' ? desc(sortCol) : asc(sortCol);
          const orderTiebreaker =
            order_by === 'desc' ? desc(tables.puzzles.id) : asc(tables.puzzles.id);
          const offset = (page - 1) * size;

          const { countResult, rows } = yield* Effect.all({
            countResult: dbRunHttp(`${kind}.count_puzzle_list_page`, (client) =>
              client.select({ count: count() }).from(tables.puzzles).where(whereClause)
            ),
            rows: dbRunHttp(`${kind}.select_puzzle_list_page`, (client) =>
              client
                .select({
                  id: tables.puzzles.id,
                  uid: tables.puzzles.uid,
                  slug: tables.puzzles.slug,
                  title: tables.puzzles.title,
                  description: tables.puzzles.description,
                  listed: tables.puzzles.listed,
                  created_at: tables.puzzles.created_at,
                  updated_at: tables.puzzles.updated_at
                })
                .from(tables.puzzles)
                .where(whereClause)
                .orderBy(orderPrimary, orderTiebreaker)
                .limit(size)
                .offset(offset)
            )
          });

          const tagsByPuzzle = yield* tagsForPuzzleIds(
            kind,
            rows.map((row) => row.id)
          );
          const list = rows.map((puzzle) => ({
            ...puzzle,
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
    .input(simple_game_add_input_schema)
    .mutation(({ input }) =>
      runTrpcEffect(
        Effect.gen(function* () {
          yield* slugHelpers.assert_slug_usable_for_mutation(input.slug, {
            override_redirect_slug: input.override_redirect_slug
          });

          const inserted_puzzles = yield* dbTransaction(`${kind}.insert_puzzle`, async (tx) => {
            if (input.override_redirect_slug) {
              await slugHelpers.delete_redirect_for_slug(tx, input.slug);
            }

            return insertWithUniqueUid(tx, tables.puzzles, (scoped, uid) =>
              scoped
                .insert(tables.puzzles)
                .values({
                  uid,
                  slug: input.slug,
                  title: input.title.trim(),
                  description: input.description?.trim() ?? '',
                  puzzle_data: emptyData,
                  listed: false
                })
                .returning()
            );
          });
          const inserted = inserted_puzzles[0];
          if (!inserted) {
            throw new Error('Failed to create puzzle');
          }

          yield* refreshListed();
          return { id: inserted.id };
        })
      )
    );

  const update_puzzle_route = protectedAdminProcedure
    .input(updateSchema)
    .mutation(({ input: { puzzle_id, puzzle_data, puzzle_slug } }) =>
      runTrpcEffect(
        Effect.gen(function* () {
          const [existing] = yield* dbRunHttp(`${kind}.find_puzzle_for_update`, (client) =>
            client
              .select({
                id: tables.puzzles.id,
                listed: tables.puzzles.listed
              })
              .from(tables.puzzles)
              .where(and(eq(tables.puzzles.id, puzzle_id), eq(tables.puzzles.slug, puzzle_slug)))
              .limit(1)
          );
          if (!existing) {
            return yield* Effect.fail(
              NotFoundError.make({
                resource: `${kind}_puzzle`,
                message: 'Puzzle not found or slug mismatch'
              })
            );
          }

          const inferred = infer(puzzle_data.game_data);
          const analysis = analyze(inferred);
          if (!analysis.canSave) {
            return yield* Effect.fail(
              BadRequestError.make({
                message: analysis.errors[0]?.message ?? 'Puzzle has errors that prevent saving'
              })
            );
          }
          if (puzzle_data.listed && !analysis.canList) {
            return yield* Effect.fail(
              BadRequestError.make({
                message: 'Cannot list this puzzle until every error and listing warning is resolved'
              })
            );
          }

          const prev_listed = existing.listed;
          const { attachments, ...puzzle_data_rest } = puzzle_data;
          const becomingListed = puzzle_data.listed && !prev_listed;

          const { updated_count, newly_added_index_ids } = yield* dbTransaction(
            `${kind}.update_puzzle`,
            async (tx) => {
              const updates: Partial<typeof tables.puzzles.$inferInsert> = {
                title: puzzle_data_rest.title,
                description: puzzle_data_rest.description,
                listed: puzzle_data_rest.listed,
                puzzle_data: inferred
              };
              if (becomingListed) updates.last_listed_at = new Date();

              const updated = await tx
                .update(tables.puzzles)
                .set(updates)
                .where(and(eq(tables.puzzles.id, puzzle_id), eq(tables.puzzles.slug, puzzle_slug)))
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
                resource: `${kind}_puzzle`,
                message: 'Puzzle not found or slug mismatch'
              })
            );
          }

          if (puzzle_data.listed || prev_listed !== puzzle_data.listed) {
            yield* refreshListed();
          }
          yield* refreshCollections();
          yield* refreshPuzzle(puzzle_slug);
          return { success: true as const, newly_added_index_ids };
        })
      )
    );

  const update_puzzle_slug_route = protectedAdminProcedure
    .input(simple_game_update_slug_input_schema)
    .mutation(({ input: { puzzle_id, current_slug, new_slug, override_redirect_slug } }) =>
      runTrpcEffect(
        Effect.gen(function* () {
          if (current_slug === new_slug) {
            return { success: true as const, slug: new_slug };
          }

          const [puzzle] = yield* dbRunHttp(`${kind}.find_puzzle_for_slug_update`, (client) =>
            client
              .select({ id: tables.puzzles.id, listed: tables.puzzles.listed })
              .from(tables.puzzles)
              .where(and(eq(tables.puzzles.id, puzzle_id), eq(tables.puzzles.slug, current_slug)))
              .limit(1)
          );
          if (!puzzle) {
            return yield* Effect.fail(
              NotFoundError.make({
                resource: `${kind}_puzzle`,
                message: 'Puzzle not found or slug mismatch'
              })
            );
          }

          yield* slugHelpers.assert_slug_usable_for_mutation(new_slug, {
            exclude_puzzle_id: puzzle_id,
            override_redirect_slug
          });

          const updated_count = yield* dbTransaction(`${kind}.update_puzzle_slug`, async (tx) => {
            await slugHelpers.delete_redirect_for_slug(tx, new_slug);
            const updated = await tx
              .update(tables.puzzles)
              .set({ slug: new_slug })
              .where(and(eq(tables.puzzles.id, puzzle_id), eq(tables.puzzles.slug, current_slug)))
              .returning();
            if (updated.length > 0) {
              await slugHelpers.upsert_redirect_for_puzzle(tx, puzzle_id, current_slug);
            }
            return updated.length;
          });

          if (updated_count === 0) {
            return yield* Effect.fail(
              NotFoundError.make({
                resource: `${kind}_puzzle`,
                message: 'Puzzle not found or slug mismatch'
              })
            );
          }

          yield* refreshPuzzle(new_slug);
          yield* settle(puzzleCache.word_puzzle.delete({ slug: current_slug }));
          if (puzzle.listed) yield* refreshListed();
          yield* refreshCollections();
          return { success: true as const, slug: new_slug };
        })
      )
    );

  const delete_puzzle_route = protectedAdminProcedure
    .input(z.object({ id: z.number().int(), slug: z.string() }))
    .mutation(({ input: { id, slug } }) =>
      runTrpcEffect(
        Effect.gen(function* () {
          const normalizedSlug = normalizeSlug(slug);
          const [puzzle] = yield* dbRunHttp(`${kind}.find_puzzle_for_delete`, (client) =>
            client
              .select({ listed: tables.puzzles.listed })
              .from(tables.puzzles)
              .where(and(eq(tables.puzzles.id, id), eq(tables.puzzles.slug, normalizedSlug)))
              .limit(1)
          );
          if (!puzzle) {
            return yield* Effect.fail(
              NotFoundError.make({ resource: `${kind}_puzzle`, message: 'Puzzle not found' })
            );
          }

          yield* dbTransaction(`${kind}.delete_puzzle`, async (tx) => {
            await tx
              .delete(tables.puzzles)
              .where(and(eq(tables.puzzles.id, id), eq(tables.puzzles.slug, normalizedSlug)));
          });

          if (puzzle.listed) yield* refreshListed();
          yield* refreshCollections();
          yield* refreshPuzzle(normalizedSlug);
          return { success: true };
        })
      )
    );

  const get_puzzle_slugs_route = protectedAdminProcedure
    .input(z.object({ puzzle_id: z.number().int() }))
    .query(({ input: { puzzle_id } }) =>
      runTrpcEffect(
        Effect.gen(function* () {
          const [puzzle] = yield* dbRunHttp(`${kind}.get_puzzle_slugs`, (client) =>
            client
              .select({ slug: tables.puzzles.slug })
              .from(tables.puzzles)
              .where(eq(tables.puzzles.id, puzzle_id))
              .limit(1)
          );
          if (!puzzle) {
            return yield* Effect.fail(
              NotFoundError.make({ resource: `${kind}_puzzle`, message: 'Puzzle not found' })
            );
          }
          const redirects = yield* dbRunHttp(`${kind}.get_puzzle_redirects`, (client) =>
            client
              .select({ slug: tables.redirects.slug, created_at: tables.redirects.created_at })
              .from(tables.redirects)
              .where(eq(tables.redirects.puzzle_id, puzzle_id))
              .orderBy(desc(tables.redirects.created_at))
          );
          const redirect_slugs = redirects.map((row) => row.slug);
          return {
            current_slug: puzzle.slug,
            redirect_slugs,
            all_slugs: [
              puzzle.slug,
              ...redirect_slugs.filter((redirect_slug) => redirect_slug !== puzzle.slug)
            ]
          };
        })
      )
    );

  const delete_redirect_slug_route = protectedAdminProcedure
    .input(
      z.object({
        puzzle_id: z.number().int(),
        redirect_slug: simple_game_slug_schema
      })
    )
    .mutation(({ input: { puzzle_id, redirect_slug } }) =>
      runTrpcEffect(
        Effect.gen(function* () {
          const [puzzle] = yield* dbRunHttp(`${kind}.find_puzzle_for_redirect_delete`, (client) =>
            client
              .select({ id: tables.puzzles.id, slug: tables.puzzles.slug })
              .from(tables.puzzles)
              .where(eq(tables.puzzles.id, puzzle_id))
              .limit(1)
          );
          if (!puzzle) {
            return yield* Effect.fail(
              NotFoundError.make({ resource: `${kind}_puzzle`, message: 'Puzzle not found' })
            );
          }
          if (puzzle.slug === redirect_slug) {
            return yield* Effect.fail(
              BadRequestError.make({ message: 'Cannot delete the current slug' })
            );
          }

          const [redirect] = yield* dbRunHttp(`${kind}.find_redirect_for_delete`, (client) =>
            client
              .select({ id: tables.redirects.id })
              .from(tables.redirects)
              .where(
                and(
                  eq(tables.redirects.slug, redirect_slug),
                  eq(tables.redirects.puzzle_id, puzzle_id)
                )
              )
              .limit(1)
          );
          if (!redirect) {
            return yield* Effect.fail(
              NotFoundError.make({
                resource: `${kind}_redirect`,
                message: 'Redirect not found'
              })
            );
          }

          yield* dbRunHttp(`${kind}.delete_redirect`, async (client) => {
            await client
              .delete(tables.redirects)
              .where(
                and(
                  eq(tables.redirects.id, redirect.id),
                  eq(tables.redirects.puzzle_id, puzzle_id)
                )
              );
          });

          yield* settle(puzzleCache.word_puzzle.delete({ slug: redirect_slug }));
          return { success: true as const };
        })
      )
    );

  const get_listed_puzzles_preview_route = publicProcedure
    .input(
      z.object({
        exclude_slug: z.string().optional(),
        exclude_id: z.number().optional()
      })
    )
    .query(({ input }) =>
      runTrpcEffect(
        Effect.gen(function* () {
          const listed = yield* puzzleCache.listed_puzzle_list.get(NO_CACHE_PARAMS);
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

  return t.router({
    check_slug_availability: check_slug_availability_route,
    get_listed_puzzles_preview: get_listed_puzzles_preview_route,
    get_puzzle_by_id: get_puzzle_by_id_route,
    get_puzzle_list_page: get_puzzle_list_page_route,
    add_puzzle: add_puzzle_route,
    update_puzzle: update_puzzle_route,
    update_puzzle_slug: update_puzzle_slug_route,
    delete_puzzle: delete_puzzle_route,
    get_puzzle_slugs: get_puzzle_slugs_route,
    delete_redirect_slug: delete_redirect_slug_route,
    stats
  });
}

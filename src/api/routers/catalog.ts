import { Effect } from 'effect';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { protectedAdminProcedure, t } from '~/api/trpc_init';
import {
  collections,
  crossword_collection_items,
  crossword_puzzle_tags,
  crossword_puzzles,
  image_assets,
  padavali_collection_items,
  padavali_puzzle_tags,
  padavali_puzzles,
  tags
} from '~/db/schema';
import { dbRunHttp, dbTransaction, type DbTransaction } from '~/effect/database';
import { BadRequestError, ConflictError, NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { puzzleNotInCollection } from '~/util/catalog/list_query';
import {
  catalog_slug_schema,
  GAME_KINDS,
  tag_slug_schema,
  type GameKind
} from '~/util/catalog/tags';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';
import { insertWithUniqueUid } from '~/util/puzzle/nano_id';

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.catch(() => Effect.void));

const refreshListedPuzzles = (game: GameKind) =>
  settle(
    invalidate_and_refresh_cache(
      game === 'padavali' ? CACHE.padavali.listed_puzzle_list : CACHE.crossword.listed_puzzle_list,
      NO_CACHE_PARAMS
    )
  );

const refreshListedCollections = () =>
  settle(invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS));

const imageColumns = {
  id: true,
  s3_key: true,
  width: true,
  height: true
} as const;

const puzzleTable = {
  padavali: padavali_puzzles,
  crossword: crossword_puzzles
} as const;

const tagLinkTable = {
  padavali: padavali_puzzle_tags,
  crossword: crossword_puzzle_tags
} as const;

const itemTable = {
  padavali: padavali_collection_items,
  crossword: crossword_collection_items
} as const;

const nextOrderIndex = async (tx: DbTransaction, collectionId: number) => {
  const [padavaliRow] = await tx
    .select({
      value: sql<number>`coalesce(max(${padavali_collection_items.order_index}), 0)`
    })
    .from(padavali_collection_items)
    .where(eq(padavali_collection_items.collection_id, collectionId));
  const [crosswordRow] = await tx
    .select({
      value: sql<number>`coalesce(max(${crossword_collection_items.order_index}), 0)`
    })
    .from(crossword_collection_items)
    .where(eq(crossword_collection_items.collection_id, collectionId));
  return Math.max(Number(padavaliRow?.value ?? 0), Number(crosswordRow?.value ?? 0)) + 1;
};

const findCollectionByUid = (uid: string) =>
  dbRunHttp('catalog.find_collection', (client) =>
    client.query.collections.findFirst({
      where: (tbl, { eq: eqFn }) => eqFn(tbl.uid, uid)
    })
  );

/** Insert missing tag slugs without racing; always reselect by slug for authoritative IDs. */
const ensureTagsBySlugs = async (tx: DbTransaction, slugs: string[]) => {
  const unique = [...new Set(slugs)];
  if (unique.length === 0) {
    return [];
  }
  await tx
    .insert(tags)
    .values(unique.map((slug) => ({ slug, name: slug })))
    .onConflictDoNothing({ target: tags.slug });
  return tx
    .select({ id: tags.id, slug: tags.slug, name: tags.name })
    .from(tags)
    .where(inArray(tags.slug, unique));
};

const list_tags_route = protectedAdminProcedure
  .input(
    z.object({
      page: z.number().int().min(1).default(1),
      size: z.number().int().min(1).max(100).default(24),
      search: z.string().max(80).optional()
    })
  )
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const search = input.search?.trim();
        const pattern = search ? `%${escapeIlikeToken(search)}%` : undefined;
        const whereClause = pattern
          ? or(ilike(tags.slug, pattern), ilike(tags.name, pattern))
          : undefined;
        const offset = (input.page - 1) * input.size;

        const { countResult, rows } = yield* Effect.all({
          countResult: dbRunHttp('catalog.count_tags', (client) =>
            client.select({ count: count() }).from(tags).where(whereClause)
          ),
          rows: dbRunHttp('catalog.list_tags', (client) =>
            client
              .select({
                id: tags.id,
                slug: tags.slug,
                name: tags.name,
                padavali_count: sql<number>`(
                  select count(*)::int from padavali_puzzle_tags pt where pt.tag_id = ${tags.id}
                )`,
                crossword_count: sql<number>`(
                  select count(*)::int from crossword_puzzle_tags ct where ct.tag_id = ${tags.id}
                )`
              })
              .from(tags)
              .where(whereClause)
              .orderBy(asc(tags.slug))
              .limit(input.size)
              .offset(offset)
          )
        });

        const list = rows.map((row) => ({
          ...row,
          padavali_count: Number(row.padavali_count),
          crossword_count: Number(row.crossword_count),
          total_count: Number(row.padavali_count) + Number(row.crossword_count)
        }));
        const total = Number(countResult[0]?.count ?? 0);
        const pageCount = Math.max(1, Math.ceil(total / input.size));
        return {
          list,
          total,
          page: input.page,
          pageCount,
          hasPrev: input.page > 1,
          hasNext: input.page < pageCount
        };
      })
    )
  );

const connected_games_route = protectedAdminProcedure
  .input(z.object({ tag_id: z.number().int() }))
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const tag = yield* dbRunHttp('catalog.find_tag', (client) =>
          client.query.tags.findFirst({
            where: (tbl, { eq: eqFn }) => eqFn(tbl.id, input.tag_id)
          })
        );
        if (!tag) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'tag', message: 'Tag not found' })
          );
        }

        const load = (game: GameKind) => {
          const puzzles = puzzleTable[game];
          const link = tagLinkTable[game];
          return dbRunHttp(`catalog.tag_games.${game}`, (client) =>
            client
              .select({
                id: puzzles.id,
                slug: puzzles.slug,
                title: puzzles.title,
                description: puzzles.description,
                listed: puzzles.listed,
                image_s3_key: image_assets.s3_key
              })
              .from(link)
              .innerJoin(puzzles, eq(puzzles.id, link.puzzle_id))
              .leftJoin(image_assets, eq(image_assets.id, puzzles.image_id))
              .where(eq(link.tag_id, input.tag_id))
              .orderBy(asc(puzzles.title))
          );
        };

        const [padavali, crossword] = yield* Effect.all([load('padavali'), load('crossword')]);
        const games = [
          ...padavali.map((row) => ({ game: 'padavali' as const, ...row })),
          ...crossword.map((row) => ({ game: 'crossword' as const, ...row }))
        ].map(({ image_s3_key, ...row }) => ({
          ...row,
          image: image_s3_key ? { s3_key: image_s3_key } : null
        }));

        return { tag, games };
      })
    )
  );

const puzzle_tags_route = protectedAdminProcedure
  .input(z.object({ game: z.enum(GAME_KINDS), puzzle_id: z.number().int() }))
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const link = tagLinkTable[input.game];
        const rows = yield* dbRunHttp('catalog.puzzle_tags', (client) =>
          client
            .select({ id: tags.id, slug: tags.slug, name: tags.name })
            .from(link)
            .innerJoin(tags, eq(tags.id, link.tag_id))
            .where(eq(link.puzzle_id, input.puzzle_id))
            .orderBy(asc(tags.slug))
        );
        return rows;
      })
    )
  );

const attach_tag_route = protectedAdminProcedure
  .input(
    z.object({
      game: z.enum(GAME_KINDS),
      puzzle_id: z.number().int(),
      slug: tag_slug_schema
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const puzzles = puzzleTable[input.game];
        const puzzle = yield* dbRunHttp('catalog.find_puzzle_for_tag', (client) =>
          client
            .select({ id: puzzles.id })
            .from(puzzles)
            .where(eq(puzzles.id, input.puzzle_id))
            .limit(1)
        );
        if (!puzzle[0]) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'puzzle', message: 'Puzzle not found' })
          );
        }

        const tag = yield* dbTransaction('catalog.attach_tag', async (tx) => {
          const rows = await ensureTagsBySlugs(tx, [input.slug]);
          const row = rows[0];
          if (!row) throw new Error('Failed to create tag');
          if (input.game === 'padavali') {
            await tx
              .insert(padavali_puzzle_tags)
              .values({ puzzle_id: input.puzzle_id, tag_id: row.id })
              .onConflictDoNothing();
          } else {
            await tx
              .insert(crossword_puzzle_tags)
              .values({ puzzle_id: input.puzzle_id, tag_id: row.id })
              .onConflictDoNothing();
          }
          return { id: row.id, slug: row.slug, name: row.name };
        });

        yield* refreshListedPuzzles(input.game);
        return tag;
      })
    )
  );

const detach_tag_route = protectedAdminProcedure
  .input(
    z.object({
      game: z.enum(GAME_KINDS),
      puzzle_id: z.number().int(),
      tag_id: z.number().int()
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        yield* dbRunHttp('catalog.detach_tag', async (client) => {
          if (input.game === 'padavali') {
            await client
              .delete(padavali_puzzle_tags)
              .where(
                and(
                  eq(padavali_puzzle_tags.puzzle_id, input.puzzle_id),
                  eq(padavali_puzzle_tags.tag_id, input.tag_id)
                )
              );
            return;
          }
          await client
            .delete(crossword_puzzle_tags)
            .where(
              and(
                eq(crossword_puzzle_tags.puzzle_id, input.puzzle_id),
                eq(crossword_puzzle_tags.tag_id, input.tag_id)
              )
            );
        });
        yield* refreshListedPuzzles(input.game);
        return { success: true };
      })
    )
  );

const list_collections_route = protectedAdminProcedure.query(() =>
  runTrpcEffect(
    dbRunHttp('catalog.list_collections', (client) =>
      client
        .select({
          id: collections.id,
          uid: collections.uid,
          slug: collections.slug,
          title: collections.title,
          description: collections.description,
          listed: collections.listed,
          image_s3_key: image_assets.s3_key,
          padavali_count: sql<number>`(
            select count(*)::int from padavali_collection_items pi
            where pi.collection_id = ${collections.id}
          )`,
          crossword_count: sql<number>`(
            select count(*)::int from crossword_collection_items ci
            where ci.collection_id = ${collections.id}
          )`
        })
        .from(collections)
        .leftJoin(image_assets, eq(image_assets.id, collections.image_id))
        .orderBy(desc(collections.created_at))
    ).pipe(
      Effect.map((rows) =>
        rows.map(({ image_s3_key, padavali_count, crossword_count, ...row }) => ({
          ...row,
          image: image_s3_key ? { s3_key: image_s3_key } : null,
          item_count: Number(padavali_count) + Number(crossword_count)
        }))
      )
    )
  )
);

const create_collection_route = protectedAdminProcedure
  .input(
    z.object({
      title: z.string().trim().min(1).max(200),
      slug: catalog_slug_schema,
      description: z.string().trim().max(2000).default('')
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const taken = yield* dbRunHttp('catalog.slug_taken', (client) =>
          client
            .select({ id: collections.id })
            .from(collections)
            .where(eq(collections.slug, input.slug))
            .limit(1)
        );
        if (taken[0]) {
          return yield* Effect.fail(
            ConflictError.make({ message: 'A collection with this slug already exists' })
          );
        }

        const created = yield* dbTransaction('catalog.create_collection', (tx) =>
          insertWithUniqueUid(tx, collections, (scoped, uid) =>
            scoped
              .insert(collections)
              .values({
                uid,
                slug: input.slug,
                title: input.title,
                description: input.description
              })
              .returning()
          )
        );
        const row = created[0];
        if (!row) {
          return yield* Effect.fail(
            BadRequestError.make({ message: 'Failed to create collection' })
          );
        }
        yield* refreshListedCollections();
        return row;
      })
    )
  );

const get_collection_route = protectedAdminProcedure
  .input(z.object({ uid: z.string().min(1) }))
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const collection = yield* dbRunHttp('catalog.get_collection', (client) =>
          client.query.collections.findFirst({
            where: (tbl, { eq: eqFn }) => eqFn(tbl.uid, input.uid),
            with: {
              image: { columns: imageColumns },
              padavali_items: {
                columns: { order_index: true },
                with: {
                  puzzle: {
                    columns: {
                      id: true,
                      slug: true,
                      title: true,
                      description: true,
                      listed: true
                    },
                    with: { image: { columns: { s3_key: true } } }
                  }
                }
              },
              crossword_items: {
                columns: { order_index: true },
                with: {
                  puzzle: {
                    columns: {
                      id: true,
                      slug: true,
                      title: true,
                      description: true,
                      listed: true
                    },
                    with: { image: { columns: { s3_key: true } } }
                  }
                }
              }
            }
          })
        );
        if (!collection) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'collection', message: 'Collection not found' })
          );
        }

        const items = [
          ...collection.padavali_items.map((item) => ({
            game: 'padavali' as const,
            order_index: item.order_index,
            puzzle: item.puzzle
          })),
          ...collection.crossword_items.map((item) => ({
            game: 'crossword' as const,
            order_index: item.order_index,
            puzzle: item.puzzle
          }))
        ].sort((a, b) => a.order_index - b.order_index || a.puzzle.id - b.puzzle.id);

        return {
          id: collection.id,
          uid: collection.uid,
          slug: collection.slug,
          title: collection.title,
          description: collection.description,
          listed: collection.listed,
          image: collection.image,
          items
        };
      })
    )
  );

const collection_meta_input = z.object({
  uid: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  slug: catalog_slug_schema,
  description: z.string().trim().max(2000),
  listed: z.boolean(),
  image_id: z.number().int().nullable()
});

const collection_item_input = z.object({
  game: z.enum(GAME_KINDS),
  puzzle_id: z.number().int()
});

const assertCollectionSlugAvailable = (collectionId: number, slug: string) =>
  Effect.gen(function* () {
    const slugOwner = yield* dbRunHttp('catalog.slug_owner', (client) =>
      client
        .select({ id: collections.id })
        .from(collections)
        .where(eq(collections.slug, slug))
        .limit(1)
    );
    if (slugOwner[0] && slugOwner[0].id !== collectionId) {
      return yield* Effect.fail(
        ConflictError.make({ message: 'A collection with this slug already exists' })
      );
    }
  });

const update_collection_route = protectedAdminProcedure
  .input(collection_meta_input)
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const existing = yield* findCollectionByUid(input.uid);
        if (!existing) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'collection', message: 'Collection not found' })
          );
        }
        yield* assertCollectionSlugAvailable(existing.id, input.slug);

        yield* dbRunHttp('catalog.update_collection', async (client) => {
          await client
            .update(collections)
            .set({
              title: input.title,
              slug: input.slug,
              description: input.description,
              listed: input.listed,
              image_id: input.image_id,
              updated_at: new Date()
            })
            .where(eq(collections.id, existing.id));
        });
        yield* refreshListedCollections();
        return { success: true as const };
      })
    )
  );

/** Persist collection metadata and full membership/order in one transaction. */
const save_collection_route = protectedAdminProcedure
  .input(
    collection_meta_input.extend({
      items: z.array(collection_item_input).max(500)
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const existing = yield* findCollectionByUid(input.uid);
        if (!existing) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'collection', message: 'Collection not found' })
          );
        }
        yield* assertCollectionSlugAvailable(existing.id, input.slug);

        const unique = [
          ...new Map(input.items.map((item) => [`${item.game}:${item.puzzle_id}`, item])).values()
        ];
        if (unique.length !== input.items.length) {
          return yield* Effect.fail(
            BadRequestError.make({ message: 'Duplicate games in collection order' })
          );
        }

        const saved = yield* dbTransaction('catalog.save_collection', async (tx) => {
          for (const item of unique) {
            const puzzles = puzzleTable[item.game];
            const puzzle = await tx
              .select({ id: puzzles.id })
              .from(puzzles)
              .where(eq(puzzles.id, item.puzzle_id))
              .limit(1);
            if (!puzzle[0]) {
              return { ok: false as const, missing: item };
            }
          }

          await tx
            .update(collections)
            .set({
              title: input.title,
              slug: input.slug,
              description: input.description,
              listed: input.listed,
              image_id: input.image_id,
              updated_at: new Date()
            })
            .where(eq(collections.id, existing.id));

          await tx
            .delete(padavali_collection_items)
            .where(eq(padavali_collection_items.collection_id, existing.id));
          await tx
            .delete(crossword_collection_items)
            .where(eq(crossword_collection_items.collection_id, existing.id));

          for (let i = 0; i < unique.length; i++) {
            const item = unique[i]!;
            const order_index = i + 1;
            if (item.game === 'padavali') {
              await tx.insert(padavali_collection_items).values({
                collection_id: existing.id,
                puzzle_id: item.puzzle_id,
                order_index
              });
            } else {
              await tx.insert(crossword_collection_items).values({
                collection_id: existing.id,
                puzzle_id: item.puzzle_id,
                order_index
              });
            }
          }

          return { ok: true as const };
        });

        if (!saved.ok) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'puzzle',
              message: `Puzzle not found (${saved.missing.game}:${saved.missing.puzzle_id})`
            })
          );
        }

        yield* refreshListedCollections();
        return { success: true as const };
      })
    )
  );

const add_collection_item = (uid: string, game: GameKind, puzzleId: number) =>
  Effect.gen(function* () {
    const collection = yield* findCollectionByUid(uid);
    if (!collection) {
      return yield* Effect.fail(
        NotFoundError.make({ resource: 'collection', message: 'Collection not found' })
      );
    }
    const puzzles = puzzleTable[game];
    const puzzle = yield* dbRunHttp('catalog.find_puzzle_for_collection', (client) =>
      client.select({ id: puzzles.id }).from(puzzles).where(eq(puzzles.id, puzzleId)).limit(1)
    );
    if (!puzzle[0]) {
      return yield* Effect.fail(
        NotFoundError.make({ resource: 'puzzle', message: 'Puzzle not found' })
      );
    }

    const order_index = yield* dbTransaction('catalog.add_collection_item', async (tx) => {
      const items = itemTable[game];
      const existing = await tx
        .select({ order_index: items.order_index })
        .from(items)
        .where(and(eq(items.collection_id, collection.id), eq(items.puzzle_id, puzzleId)))
        .limit(1);
      if (existing[0]) return existing[0].order_index;
      const orderIndex = await nextOrderIndex(tx, collection.id);
      await tx.insert(items).values({
        collection_id: collection.id,
        puzzle_id: puzzleId,
        order_index: orderIndex
      });
      return orderIndex;
    });

    yield* refreshListedCollections();
    return { order_index };
  });

const set_puzzle_links_route = protectedAdminProcedure
  .input(
    z.object({
      game: z.enum(GAME_KINDS),
      puzzle_id: z.number().int(),
      tag_slugs: z.array(tag_slug_schema).max(40),
      collection_uids: z.array(z.string().min(1).max(32)).max(40)
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const puzzles = puzzleTable[input.game];
        const puzzle = yield* dbRunHttp('catalog.find_puzzle_for_links', (client) =>
          client
            .select({ id: puzzles.id })
            .from(puzzles)
            .where(eq(puzzles.id, input.puzzle_id))
            .limit(1)
        );
        if (!puzzle[0]) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'puzzle', message: 'Puzzle not found' })
          );
        }

        const tagSlugs = [...new Set(input.tag_slugs)];
        const collectionUids = [...new Set(input.collection_uids)];

        const linked = yield* dbTransaction('catalog.set_puzzle_links', async (tx) => {
          const resolvedTags = await ensureTagsBySlugs(tx, tagSlugs);
          const tagIds = resolvedTags.map((tag) => tag.id);

          const foundCollections =
            collectionUids.length === 0
              ? []
              : await tx
                  .select({ id: collections.id, uid: collections.uid })
                  .from(collections)
                  .where(inArray(collections.uid, collectionUids));
          if (foundCollections.length !== collectionUids.length) {
            return { ok: false as const };
          }
          const desiredCollectionIds = new Set(foundCollections.map((row) => row.id));

          if (input.game === 'padavali') {
            await tx
              .delete(padavali_puzzle_tags)
              .where(eq(padavali_puzzle_tags.puzzle_id, input.puzzle_id));
            if (tagIds.length > 0) {
              await tx
                .insert(padavali_puzzle_tags)
                .values(tagIds.map((tag_id) => ({ puzzle_id: input.puzzle_id, tag_id })));
            }
            const current = await tx
              .select({ collection_id: padavali_collection_items.collection_id })
              .from(padavali_collection_items)
              .where(eq(padavali_collection_items.puzzle_id, input.puzzle_id));
            for (const row of current) {
              if (!desiredCollectionIds.has(row.collection_id)) {
                await tx
                  .delete(padavali_collection_items)
                  .where(
                    and(
                      eq(padavali_collection_items.puzzle_id, input.puzzle_id),
                      eq(padavali_collection_items.collection_id, row.collection_id)
                    )
                  );
              }
            }
            const currentIds = new Set(current.map((row) => row.collection_id));
            for (const collectionId of desiredCollectionIds) {
              if (currentIds.has(collectionId)) continue;
              const orderIndex = await nextOrderIndex(tx, collectionId);
              await tx.insert(padavali_collection_items).values({
                collection_id: collectionId,
                puzzle_id: input.puzzle_id,
                order_index: orderIndex
              });
            }
            return { ok: true as const };
          }

          await tx
            .delete(crossword_puzzle_tags)
            .where(eq(crossword_puzzle_tags.puzzle_id, input.puzzle_id));
          if (tagIds.length > 0) {
            await tx
              .insert(crossword_puzzle_tags)
              .values(tagIds.map((tag_id) => ({ puzzle_id: input.puzzle_id, tag_id })));
          }
          const current = await tx
            .select({ collection_id: crossword_collection_items.collection_id })
            .from(crossword_collection_items)
            .where(eq(crossword_collection_items.puzzle_id, input.puzzle_id));
          for (const row of current) {
            if (!desiredCollectionIds.has(row.collection_id)) {
              await tx
                .delete(crossword_collection_items)
                .where(
                  and(
                    eq(crossword_collection_items.puzzle_id, input.puzzle_id),
                    eq(crossword_collection_items.collection_id, row.collection_id)
                  )
                );
            }
          }
          const currentIds = new Set(current.map((row) => row.collection_id));
          for (const collectionId of desiredCollectionIds) {
            if (currentIds.has(collectionId)) continue;
            const orderIndex = await nextOrderIndex(tx, collectionId);
            await tx.insert(crossword_collection_items).values({
              collection_id: collectionId,
              puzzle_id: input.puzzle_id,
              order_index: orderIndex
            });
          }
          return { ok: true as const };
        });

        if (!linked.ok) {
          return yield* Effect.fail(BadRequestError.make({ message: 'Unknown collection' }));
        }

        yield* refreshListedPuzzles(input.game);
        yield* refreshListedCollections();
        return { success: true as const };
      })
    )
  );

const add_items_route = protectedAdminProcedure
  .input(
    z.object({
      uid: z.string().min(1),
      items: z
        .array(
          z.object({
            game: z.enum(GAME_KINDS),
            puzzle_id: z.number().int()
          })
        )
        .min(1)
        .max(100)
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const collection = yield* findCollectionByUid(input.uid);
        if (!collection) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'collection', message: 'Collection not found' })
          );
        }

        const unique = [
          ...new Map(input.items.map((item) => [`${item.game}:${item.puzzle_id}`, item])).values()
        ];

        const added = yield* dbTransaction('catalog.add_collection_items', async (tx) => {
          let countAdded = 0;
          for (const item of unique) {
            const puzzles = puzzleTable[item.game];
            const puzzle = await tx
              .select({ id: puzzles.id })
              .from(puzzles)
              .where(eq(puzzles.id, item.puzzle_id))
              .limit(1);
            if (!puzzle[0]) continue;

            if (item.game === 'padavali') {
              const existing = await tx
                .select({ puzzle_id: padavali_collection_items.puzzle_id })
                .from(padavali_collection_items)
                .where(
                  and(
                    eq(padavali_collection_items.collection_id, collection.id),
                    eq(padavali_collection_items.puzzle_id, item.puzzle_id)
                  )
                )
                .limit(1);
              if (existing[0]) continue;
              const orderIndex = await nextOrderIndex(tx, collection.id);
              await tx.insert(padavali_collection_items).values({
                collection_id: collection.id,
                puzzle_id: item.puzzle_id,
                order_index: orderIndex
              });
            } else {
              const existing = await tx
                .select({ puzzle_id: crossword_collection_items.puzzle_id })
                .from(crossword_collection_items)
                .where(
                  and(
                    eq(crossword_collection_items.collection_id, collection.id),
                    eq(crossword_collection_items.puzzle_id, item.puzzle_id)
                  )
                )
                .limit(1);
              if (existing[0]) continue;
              const orderIndex = await nextOrderIndex(tx, collection.id);
              await tx.insert(crossword_collection_items).values({
                collection_id: collection.id,
                puzzle_id: item.puzzle_id,
                order_index: orderIndex
              });
            }
            countAdded += 1;
          }
          return countAdded;
        });

        yield* refreshListedCollections();
        return { added };
      })
    )
  );

const add_item_route = protectedAdminProcedure
  .input(
    z.object({
      uid: z.string().min(1),
      game: z.enum(GAME_KINDS),
      puzzle_id: z.number().int()
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(add_collection_item(input.uid, input.game, input.puzzle_id))
  );

const remove_item_route = protectedAdminProcedure
  .input(
    z.object({
      uid: z.string().min(1),
      game: z.enum(GAME_KINDS),
      puzzle_id: z.number().int()
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const collection = yield* findCollectionByUid(input.uid);
        if (!collection) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'collection', message: 'Collection not found' })
          );
        }
        yield* dbRunHttp('catalog.remove_collection_item', async (client) => {
          if (input.game === 'padavali') {
            await client
              .delete(padavali_collection_items)
              .where(
                and(
                  eq(padavali_collection_items.collection_id, collection.id),
                  eq(padavali_collection_items.puzzle_id, input.puzzle_id)
                )
              );
            return;
          }
          await client
            .delete(crossword_collection_items)
            .where(
              and(
                eq(crossword_collection_items.collection_id, collection.id),
                eq(crossword_collection_items.puzzle_id, input.puzzle_id)
              )
            );
        });
        yield* refreshListedCollections();
        return { success: true };
      })
    )
  );

const reorder_route = protectedAdminProcedure
  .input(
    z.object({
      uid: z.string().min(1),
      items: z.array(z.object({ game: z.enum(GAME_KINDS), puzzle_id: z.number().int() })).max(500)
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const collection = yield* findCollectionByUid(input.uid);
        if (!collection) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'collection', message: 'Collection not found' })
          );
        }

        const result = yield* dbTransaction('catalog.reorder_collection', async (tx) => {
          const padavaliRows = await tx
            .select({ puzzle_id: padavali_collection_items.puzzle_id })
            .from(padavali_collection_items)
            .where(eq(padavali_collection_items.collection_id, collection.id));
          const crosswordRows = await tx
            .select({ puzzle_id: crossword_collection_items.puzzle_id })
            .from(crossword_collection_items)
            .where(eq(crossword_collection_items.collection_id, collection.id));
          const current = new Set([
            ...padavaliRows.map((row) => `padavali:${row.puzzle_id}`),
            ...crosswordRows.map((row) => `crossword:${row.puzzle_id}`)
          ]);
          const incoming = input.items.map((item) => `${item.game}:${item.puzzle_id}`);
          if (
            incoming.length !== current.size ||
            new Set(incoming).size !== incoming.length ||
            incoming.some((key) => !current.has(key))
          ) {
            return { ok: false as const };
          }

          for (let index = 0; index < input.items.length; index++) {
            const item = input.items[index]!;
            const items = itemTable[item.game];
            await tx
              .update(items)
              .set({ order_index: index + 1 })
              .where(
                and(eq(items.collection_id, collection.id), eq(items.puzzle_id, item.puzzle_id))
              );
          }
          return { ok: true as const };
        });

        if (!result.ok) {
          return yield* Effect.fail(
            BadRequestError.make({
              message: 'Reorder list must contain each game in the collection once'
            })
          );
        }
        yield* refreshListedCollections();
        return { success: true };
      })
    )
  );

const puzzle_collections_route = protectedAdminProcedure
  .input(z.object({ game: z.enum(GAME_KINDS), puzzle_id: z.number().int() }))
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const items = itemTable[input.game];
        return yield* dbRunHttp('catalog.puzzle_collections', (client) =>
          client
            .select({
              id: collections.id,
              uid: collections.uid,
              slug: collections.slug,
              title: collections.title,
              order_index: items.order_index
            })
            .from(items)
            .innerJoin(collections, eq(collections.id, items.collection_id))
            .where(eq(items.puzzle_id, input.puzzle_id))
            .orderBy(asc(collections.title))
        );
      })
    )
  );

const search_puzzles_route = protectedAdminProcedure
  .input(
    z.object({
      query: z.string().max(200).default(''),
      tag_slug: z.string().min(1).max(80).optional(),
      game: z.enum(['all', ...GAME_KINDS]).default('all'),
      limit: z.number().int().min(1).max(60).default(36),
      exclude_collection_id: z.number().int().optional()
    })
  )
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const games: GameKind[] = input.game === 'all' ? ['padavali', 'crossword'] : [input.game];
        const tokens = tokenizeSearchQuery(input.query);

        const load = (game: GameKind) => {
          const puzzles = puzzleTable[game];
          const conditions = [];
          for (const token of tokens) {
            const pattern = `%${escapeIlikeToken(token)}%`;
            conditions.push(
              or(ilike(puzzles.title, pattern), ilike(puzzles.description, pattern))!
            );
          }
          if (input.tag_slug) {
            conditions.push(
              sql`exists (
                select 1 from ${sql.raw(game === 'padavali' ? 'padavali_puzzle_tags' : 'crossword_puzzle_tags')} pt
                inner join tags t on t.id = pt.tag_id
                where pt.puzzle_id = ${puzzles.id} and t.slug = ${input.tag_slug}
              )`
            );
          }
          if (input.exclude_collection_id !== undefined) {
            conditions.push(puzzleNotInCollection(puzzles.id, game, input.exclude_collection_id));
          }
          const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
          return dbRunHttp(`catalog.search_puzzles.${game}`, (client) =>
            client
              .select({
                id: puzzles.id,
                slug: puzzles.slug,
                title: puzzles.title,
                description: puzzles.description,
                listed: puzzles.listed,
                created_at: puzzles.created_at,
                image_s3_key: image_assets.s3_key
              })
              .from(puzzles)
              .leftJoin(image_assets, eq(image_assets.id, puzzles.image_id))
              .where(whereClause)
              .orderBy(desc(puzzles.created_at))
              .limit(input.limit)
          ).pipe(
            Effect.map((rows) =>
              rows.map(({ image_s3_key, created_at, ...row }) => ({
                ...row,
                game,
                created_at,
                image: image_s3_key ? { s3_key: image_s3_key } : null
              }))
            )
          );
        };

        const groups = yield* Effect.all(games.map(load));
        return groups
          .flat()
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
          .slice(0, input.limit)
          .map(({ created_at: _created_at, ...row }) => row);
      })
    )
  );

export const catalog_router = t.router({
  list_tags: list_tags_route,
  connected_games: connected_games_route,
  puzzle_tags: puzzle_tags_route,
  attach_tag: attach_tag_route,
  detach_tag: detach_tag_route,
  list_collections: list_collections_route,
  create_collection: create_collection_route,
  get_collection: get_collection_route,
  update_collection: update_collection_route,
  save_collection: save_collection_route,
  set_puzzle_links: set_puzzle_links_route,
  add_items: add_items_route,
  add_item: add_item_route,
  remove_item: remove_item_route,
  reorder: reorder_route,
  puzzle_collections: puzzle_collections_route,
  search_puzzles: search_puzzles_route
});

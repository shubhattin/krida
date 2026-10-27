import { Effect } from 'effect';
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { protectedAdminProcedure, t } from '~/api/trpc_init';
import {
  anveshi_puzzles,
  bhramita_puzzles,
  collections,
  collection_items,
  dvayi_puzzles,
  image_assets,
  padajala_puzzles,
  padavali_puzzles,
  puzzle_tags,
  puzzles,
  surupa_puzzles,
  tags
} from '~/db/schema';
import { dbRunHttp, dbTransaction, type DbTransaction } from '~/effect/database';
import { BadRequestError, ConflictError, NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import {
  CACHE,
  invalidate_and_refresh_cache,
  invalidate_padavali_sitemap,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import {
  catalog_slug_schema,
  GAME_KINDS,
  isGameKind,
  tag_slug_schema,
  type GameKind
} from '~/util/catalog/tags';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';
import { insertWithUniqueUid } from '~/util/puzzle/nano_id';
import {
  anveshiEntries,
  dvayiEntries,
  padajalaEntries,
  padavaliEntries,
  wordEntries,
  type PuzzleEntries
} from '~/util/catalog/puzzle_entries';

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.catch(() => Effect.void));

const refreshListedPuzzles = (game: GameKind) =>
  settle(invalidate_and_refresh_cache(CACHE[game].listed_puzzle_list, NO_CACHE_PARAMS));

const refreshListedCollections = () =>
  settle(
    Effect.all([
      invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS),
      invalidate_padavali_sitemap()
    ])
  );

const loadTagPuzzleRefs = (tagId: number) =>
  dbRunHttp('catalog.tag_puzzle_refs', (client) =>
    client
      .select({ game: puzzles.kind, puzzle_id: puzzle_tags.puzzle_id })
      .from(puzzle_tags)
      .innerJoin(puzzles, eq(puzzles.id, puzzle_tags.puzzle_id))
      .where(eq(puzzle_tags.tag_id, tagId))
  );

const listedPuzzleIdsForGame = (game: GameKind, puzzleIds: number[]) => {
  if (puzzleIds.length === 0) return Effect.succeed<number[]>([]);
  return dbRunHttp(`catalog.listed_tag_puzzles.${game}`, (client) =>
    client
      .select({ id: puzzles.id })
      .from(puzzles)
      .where(and(eq(puzzles.kind, game), inArray(puzzles.id, puzzleIds), eq(puzzles.listed, true)))
  ).pipe(Effect.map((rows) => rows.map((row) => row.id)));
};

const listedCollectionContainsPuzzles = (game: GameKind, puzzleIds: number[]) => {
  if (puzzleIds.length === 0) return Effect.succeed(false);
  return dbRunHttp(`catalog.listed_collections_for_tag.${game}`, (client) =>
    client
      .select({ id: collections.id })
      .from(collection_items)
      .innerJoin(collections, eq(collections.id, collection_items.collection_id))
      .innerJoin(puzzles, and(eq(puzzles.id, collection_items.puzzle_id), eq(puzzles.kind, game)))
      .where(and(inArray(collection_items.puzzle_id, puzzleIds), eq(collections.listed, true)))
      .limit(1)
  ).pipe(Effect.map((rows) => rows.length > 0));
};

/** Listed puzzle lists embed tag slugs; collection filters join those lists. Skip untouched games. */
const refreshPublicCachesForTagPuzzles = (items: { game: GameKind; puzzle_id: number }[]) =>
  Effect.gen(function* () {
    if (items.length === 0) return;
    // SAFETY: GAME_KINDS is the full GameKind union, so these entries cover every key.
    const idsByGame = Object.fromEntries(
      GAME_KINDS.map((game) => [
        game,
        [...new Set(items.filter((item) => item.game === game).map((item) => item.puzzle_id))]
      ])
    ) as Record<GameKind, number[]>;

    // SAFETY: GAME_KINDS is the full GameKind union, so these entries cover every key.
    const listedByGame = yield* Effect.all(
      Object.fromEntries(
        GAME_KINDS.map((game) => [game, listedPuzzleIdsForGame(game, idsByGame[game])])
      ) as Record<GameKind, ReturnType<typeof listedPuzzleIdsForGame>>
    );

    yield* Effect.all([
      ...GAME_KINDS.map((game) =>
        listedByGame[game].length > 0 ? refreshListedPuzzles(game) : Effect.void
      ),
      Effect.gen(function* () {
        const hits = yield* Effect.all(
          GAME_KINDS.map((game) => listedCollectionContainsPuzzles(game, listedByGame[game]))
        );
        if (hits.some(Boolean)) {
          yield* settle(
            invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS)
          );
        }
      })
    ]);
  });

const imageColumns = {
  id: true,
  s3_key: true,
  width: true,
  height: true
} as const;

const nextOrderIndex = async (tx: DbTransaction, collectionId: number) => {
  const [row] = await tx
    .select({
      value: sql<number>`coalesce(max(${collection_items.order_index}), 0)`
    })
    .from(collection_items)
    .where(eq(collection_items.collection_id, collectionId));
  return Number(row?.value ?? 0) + 1;
};

/**
 * Public collection order. `order_index` is 1..n across ordered (always listed) rows;
 * unordered listed rows follow, newest first. Every writer takes this lock first so two
 * concurrent edits cannot leave gaps or duplicate positions. Raw SQL on purpose: an order
 * change must not bump `updated_at` (sitemap lastmod).
 */
const lockCollectionOrder = (tx: DbTransaction) =>
  tx.execute(sql`select pg_advisory_xact_lock(hashtext('collections.order_index'))`);

/** Close gaps left by an unlisted or deleted collection, keeping relative order. */
const compactCollectionOrder = async (tx: DbTransaction) => {
  await tx.execute(sql`
    update collections c set order_index = r.rn::smallint
    from (
      select id, row_number() over (order by order_index, id) as rn
      from collections where order_index is not null and listed
    ) r
    where c.id = r.id and c.order_index is distinct from r.rn
  `);
};

/** Ordered collection ids, position 1 first. */
const orderedCollectionIds = async (tx: DbTransaction) => {
  const rows = await tx
    .select({ id: collections.id })
    .from(collections)
    .where(isNotNull(collections.order_index))
    .orderBy(asc(collections.order_index), asc(collections.id));
  return rows.map((row) => row.id);
};

/** `ids` get positions 1..n; every other collection becomes unordered. */
const writeCollectionOrder = async (tx: DbTransaction, ids: number[]) => {
  const idList = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `
  );
  await tx.execute(
    ids.length === 0
      ? sql`update collections set order_index = null where order_index is not null`
      : sql`update collections set order_index = null
          where order_index is not null and id not in (${idList})`
  );
  if (ids.length === 0) return;
  await tx.execute(sql`
    update collections c set order_index = v.ord::smallint
    from unnest(array[${idList}]::int[]) with ordinality as v(id, ord)
    where c.id = v.id and c.order_index is distinct from v.ord
  `);
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
    .values(unique.map((slug) => ({ slug })))
    .onConflictDoNothing({ target: tags.slug });
  return tx.select({ id: tags.id, slug: tags.slug }).from(tags).where(inArray(tags.slug, unique));
};

const tag_puzzle_input = z.object({
  game: z.enum(GAME_KINDS),
  puzzle_id: z.number().int()
});

const loadTagPuzzles = (tagId: number) =>
  dbRunHttp('catalog.tag_games', (client) =>
    client
      .select({
        game: puzzles.kind,
        id: puzzles.id,
        slug: puzzles.slug,
        title: puzzles.title,
        description: puzzles.description,
        listed: puzzles.listed,
        image_s3_key: image_assets.s3_key
      })
      .from(puzzle_tags)
      .innerJoin(puzzles, eq(puzzles.id, puzzle_tags.puzzle_id))
      .leftJoin(image_assets, eq(image_assets.id, puzzles.image_id))
      .where(eq(puzzle_tags.tag_id, tagId))
      .orderBy(asc(puzzles.title))
  ).pipe(
    Effect.map((rows) =>
      rows.map(({ image_s3_key, ...row }) => ({
        ...row,
        image: image_s3_key ? { s3_key: image_s3_key } : null
      }))
    )
  );

const findTagBySlug = (slug: string) =>
  dbRunHttp('catalog.find_tag_by_slug', (client) =>
    client.query.tags.findFirst({
      where: (tbl, { eq: eqFn }) => eqFn(tbl.slug, slug)
    })
  );

const assertTagSlugAvailable = (tagId: number, slug: string) =>
  Effect.gen(function* () {
    const owner = yield* dbRunHttp('catalog.tag_slug_owner', (client) =>
      client.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).limit(1)
    );
    if (owner[0] && owner[0].id !== tagId) {
      return yield* Effect.fail(
        ConflictError.make({ message: 'A tag with this slug already exists' })
      );
    }
  });

const tagUsageSql = sql<number>`(
  select count(*)::int from puzzle_tags pt where pt.tag_id = ${tags.id}
)`;

const list_tags_route = protectedAdminProcedure
  .input(
    z.object({
      page: z.number().int().min(1).default(1),
      size: z.number().int().min(1).max(100).default(24),
      search: z.string().max(80).optional(),
      sort: z.enum(['slug', 'created_at', 'count']).default('slug'),
      order: z.enum(['asc', 'desc']).default('asc'),
      usage: z.enum(['all', 'used', 'unused']).default('all')
    })
  )
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const search = input.search?.trim();
        const pattern = search ? `%${escapeIlikeToken(search)}%` : undefined;
        const searchWhere = pattern ? ilike(tags.slug, pattern) : undefined;
        const usageWhere =
          input.usage === 'used'
            ? sql`${tagUsageSql} > 0`
            : input.usage === 'unused'
              ? sql`${tagUsageSql} = 0`
              : undefined;
        const whereClause = and(searchWhere, usageWhere);
        const sortColumn = {
          slug: tags.slug,
          created_at: tags.created_at,
          count: tagUsageSql
        }[input.sort];
        const orderBy = input.order === 'desc' ? desc(sortColumn) : asc(sortColumn);
        const offset = (input.page - 1) * input.size;

        // One round trip per query (Neon HTTP in prod): keep the counts as
        // correlated subqueries rather than extra group-by queries.
        const { countResult, rows } = yield* Effect.all({
          countResult: dbRunHttp('catalog.count_tags', (client) =>
            client.select({ count: count() }).from(tags).where(whereClause)
          ),
          rows: dbRunHttp('catalog.list_tags', (client) =>
            client
              .select({
                id: tags.id,
                slug: tags.slug,
                padavali_count: sql<number>`(
                  select count(*)::int from puzzle_tags pt
                  inner join puzzles p on p.id = pt.puzzle_id
                  where pt.tag_id = ${tags.id} and p.kind = 'padavali'
                )`,
                padajala_count: sql<number>`(
                  select count(*)::int from puzzle_tags ct
                  inner join puzzles p on p.id = ct.puzzle_id
                  where ct.tag_id = ${tags.id} and p.kind = 'padajala'
                )`,
                extra_count: sql<number>`(
                  select count(*)::int from puzzle_tags et
                  inner join puzzles p on p.id = et.puzzle_id
                  where et.tag_id = ${tags.id} and p.kind in ('dvayi', 'bhramita', 'surupa', 'anveshi')
                )`
              })
              .from(tags)
              .where(whereClause)
              .orderBy(orderBy, asc(tags.slug))
              .limit(input.size)
              .offset(offset)
          )
        });

        const list = rows.map(({ extra_count, ...row }) => ({
          ...row,
          padavali_count: Number(row.padavali_count),
          padajala_count: Number(row.padajala_count),
          total_count: Number(row.padavali_count) + Number(row.padajala_count) + Number(extra_count)
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

        const games = yield* loadTagPuzzles(input.tag_id);
        return { tag, games };
      })
    )
  );

const get_tag_route = protectedAdminProcedure
  .input(z.object({ slug: tag_slug_schema }))
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const tag = yield* findTagBySlug(input.slug);
        if (!tag) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'tag', message: 'Tag not found' })
          );
        }
        const games = yield* loadTagPuzzles(tag.id);
        return {
          id: tag.id,
          slug: tag.slug,
          puzzles: games.map(({ game, id, slug, title, description, listed, image }) => ({
            game,
            puzzle: { id, slug, title, description: description ?? '', listed, image }
          }))
        };
      })
    )
  );

const create_tag_route = protectedAdminProcedure
  .input(
    z.object({
      slug: tag_slug_schema
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const taken = yield* dbRunHttp('catalog.tag_slug_taken', (client) =>
          client.select({ id: tags.id }).from(tags).where(eq(tags.slug, input.slug)).limit(1)
        );
        if (taken[0]) {
          return yield* Effect.fail(
            ConflictError.make({ message: 'A tag with this slug already exists' })
          );
        }
        const [created] = yield* dbRunHttp('catalog.create_tag', (client) =>
          client.insert(tags).values({ slug: input.slug }).returning()
        );
        if (!created) {
          return yield* Effect.fail(BadRequestError.make({ message: 'Failed to create tag' }));
        }
        return created;
      })
    )
  );

const save_tag_route = protectedAdminProcedure
  .input(
    z.object({
      tag_id: z.number().int(),
      slug: tag_slug_schema,
      puzzles: z.array(tag_puzzle_input).max(500)
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const [existing] = yield* dbRunHttp('catalog.find_tag_for_save', (client) =>
          client
            .select({ id: tags.id, slug: tags.slug })
            .from(tags)
            .where(eq(tags.id, input.tag_id))
            .limit(1)
        );
        if (!existing) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'tag', message: 'Tag not found' })
          );
        }
        const unique = [
          ...new Map(input.puzzles.map((item) => [`${item.game}:${item.puzzle_id}`, item])).values()
        ];
        const [, previous] = yield* Effect.all([
          assertTagSlugAvailable(existing.id, input.slug),
          loadTagPuzzleRefs(existing.id)
        ]);

        const saved = yield* dbTransaction('catalog.save_tag', async (tx) => {
          for (const item of unique) {
            const puzzle = await tx
              .select({ id: puzzles.id })
              .from(puzzles)
              .where(and(eq(puzzles.id, item.puzzle_id), eq(puzzles.kind, item.game)))
              .limit(1);
            if (!puzzle[0]) {
              return { ok: false as const, missing: item };
            }
          }

          await tx.update(tags).set({ slug: input.slug }).where(eq(tags.id, existing.id));
          await tx.delete(puzzle_tags).where(eq(puzzle_tags.tag_id, existing.id));
          if (unique.length > 0) {
            await tx.insert(puzzle_tags).values(
              unique.map((item) => ({
                puzzle_id: item.puzzle_id,
                tag_id: existing.id
              }))
            );
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

        const affected = [
          ...new Map(
            [...previous, ...unique].map((item) => [
              `${item.game}:${item.puzzle_id}`,
              { game: item.game, puzzle_id: item.puzzle_id }
            ])
          ).values()
        ];
        yield* refreshPublicCachesForTagPuzzles(affected);
        return { success: true as const, slug: input.slug };
      })
    )
  );

const puzzle_tags_route = protectedAdminProcedure
  .input(z.object({ game: z.enum(GAME_KINDS), puzzle_id: z.number().int() }))
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const rows = yield* dbRunHttp('catalog.puzzle_tags', (client) =>
          client
            .select({ id: tags.id, slug: tags.slug })
            .from(puzzle_tags)
            .innerJoin(tags, eq(tags.id, puzzle_tags.tag_id))
            .innerJoin(
              puzzles,
              and(eq(puzzles.id, puzzle_tags.puzzle_id), eq(puzzles.kind, input.game))
            )
            .where(eq(puzzle_tags.puzzle_id, input.puzzle_id))
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
        const puzzle = yield* dbRunHttp('catalog.find_puzzle_for_tag', (client) =>
          client
            .select({ id: puzzles.id })
            .from(puzzles)
            .where(and(eq(puzzles.id, input.puzzle_id), eq(puzzles.kind, input.game)))
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
          await tx
            .insert(puzzle_tags)
            .values({ puzzle_id: input.puzzle_id, tag_id: row.id })
            .onConflictDoNothing();
          return { id: row.id, slug: row.slug };
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
        // The link table is shared now — confirm the row belongs to this game first.
        const [link] = yield* dbRunHttp('catalog.find_tag_link', (client) =>
          client
            .select({ kind: puzzles.kind })
            .from(puzzle_tags)
            .innerJoin(puzzles, eq(puzzles.id, puzzle_tags.puzzle_id))
            .where(
              and(eq(puzzle_tags.puzzle_id, input.puzzle_id), eq(puzzle_tags.tag_id, input.tag_id))
            )
            .limit(1)
        );
        if (!link || !isGameKind(link.kind) || link.kind !== input.game) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'tag', message: 'Tag link not found' })
          );
        }
        yield* dbRunHttp('catalog.detach_tag', async (client) => {
          await client
            .delete(puzzle_tags)
            .where(
              and(eq(puzzle_tags.puzzle_id, input.puzzle_id), eq(puzzle_tags.tag_id, input.tag_id))
            );
        });
        yield* refreshListedPuzzles(link.kind);
        return { success: true };
      })
    )
  );

const list_collections_route = protectedAdminProcedure.query(() =>
  runTrpcEffect(
    // Single round trip (Neon HTTP in prod): keep the counts as correlated
    // subqueries rather than an extra group-by query.
    dbRunHttp('catalog.list_collections', (client) =>
      client
        .select({
          id: collections.id,
          uid: collections.uid,
          slug: collections.slug,
          title: collections.title,
          description: collections.description,
          listed: collections.listed,
          order_index: collections.order_index,
          created_at: collections.created_at,
          updated_at: collections.updated_at,
          image_s3_key: image_assets.s3_key,
          padavali_count: sql<number>`(
            select count(*)::int from collection_items pi
            inner join puzzles p on p.id = pi.puzzle_id
            where pi.collection_id = ${collections.id} and p.kind = 'padavali'
          )`,
          padajala_count: sql<number>`(
            select count(*)::int from collection_items ci
            inner join puzzles p on p.id = ci.puzzle_id
            where ci.collection_id = ${collections.id} and p.kind = 'padajala'
          )`,
          extra_count: sql<number>`(
            select count(*)::int from collection_items ei
            inner join puzzles p on p.id = ei.puzzle_id
            where ei.collection_id = ${collections.id} and p.kind in ('dvayi', 'bhramita', 'surupa', 'anveshi')
          )`
        })
        .from(collections)
        .leftJoin(image_assets, eq(image_assets.id, collections.image_id))
        .orderBy(asc(collections.order_index), desc(collections.created_at), desc(collections.id))
    ).pipe(
      Effect.map((rows) =>
        rows.map(({ image_s3_key, padavali_count, padajala_count, extra_count, ...row }) => ({
          ...row,
          image: image_s3_key ? { s3_key: image_s3_key } : null,
          item_count: Number(padavali_count) + Number(padajala_count) + Number(extra_count)
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
              items: {
                columns: { order_index: true },
                orderBy: (tbl, { asc: ascFn }) => ascFn(tbl.order_index),
                with: {
                  puzzle: {
                    columns: {
                      id: true,
                      kind: true,
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

        const [orderStats] = yield* dbRunHttp('catalog.collection_order_stats', (client) =>
          client
            .select({ ordered: count(collections.order_index) })
            .from(collections)
            .where(eq(collections.listed, true))
        );

        const items = collection.items
          .map((item) => ({
            game: item.puzzle.kind,
            order_index: item.order_index,
            puzzle: {
              id: item.puzzle.id,
              slug: item.puzzle.slug,
              title: item.puzzle.title,
              description: item.puzzle.description,
              listed: item.puzzle.listed,
              image: item.puzzle.image
            }
          }))
          .sort((a, b) => a.order_index - b.order_index || a.puzzle.id - b.puzzle.id);

        return {
          id: collection.id,
          uid: collection.uid,
          slug: collection.slug,
          title: collection.title,
          description: collection.description,
          listed: collection.listed,
          order_index: collection.order_index,
          ordered_count: Number(orderStats?.ordered ?? 0),
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

/** Row values for a metadata save. Only listed collections hold a public position. */
const collectionMetaValues = (input: z.infer<typeof collection_meta_input>) => {
  const values: Partial<typeof collections.$inferInsert> = {
    title: input.title,
    slug: input.slug,
    description: input.description,
    listed: input.listed,
    image_id: input.image_id,
    updated_at: new Date()
  };
  if (!input.listed) values.order_index = null;
  return values;
};

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

        yield* dbTransaction('catalog.update_collection', async (tx) => {
          // Unlisting drops the public position; compacting is a no-op otherwise.
          const unlisting = !input.listed;
          if (unlisting) await lockCollectionOrder(tx);
          await tx
            .update(collections)
            .set(collectionMetaValues(input))
            .where(eq(collections.id, existing.id));
          if (unlisting) await compactCollectionOrder(tx);
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
            const puzzle = await tx
              .select({ id: puzzles.id })
              .from(puzzles)
              .where(and(eq(puzzles.id, item.puzzle_id), eq(puzzles.kind, item.game)))
              .limit(1);
            if (!puzzle[0]) {
              return { ok: false as const, missing: item };
            }
          }

          // Unlisting drops the public position; compacting is a no-op otherwise.
          const unlisting = !input.listed;
          if (unlisting) await lockCollectionOrder(tx);
          await tx
            .update(collections)
            .set(collectionMetaValues(input))
            .where(eq(collections.id, existing.id));
          if (unlisting) await compactCollectionOrder(tx);

          await tx.delete(collection_items).where(eq(collection_items.collection_id, existing.id));

          if (unique.length > 0) {
            await tx.insert(collection_items).values(
              unique.map((item, index) => ({
                collection_id: existing.id,
                puzzle_id: item.puzzle_id,
                order_index: index + 1
              }))
            );
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
    const puzzle = yield* dbRunHttp('catalog.find_puzzle_for_collection', (client) =>
      client
        .select({ id: puzzles.id })
        .from(puzzles)
        .where(and(eq(puzzles.id, puzzleId), eq(puzzles.kind, game)))
        .limit(1)
    );
    if (!puzzle[0]) {
      return yield* Effect.fail(
        NotFoundError.make({ resource: 'puzzle', message: 'Puzzle not found' })
      );
    }

    const order_index = yield* dbTransaction('catalog.add_collection_item', async (tx) => {
      const existing = await tx
        .select({ order_index: collection_items.order_index })
        .from(collection_items)
        .where(
          and(
            eq(collection_items.collection_id, collection.id),
            eq(collection_items.puzzle_id, puzzleId)
          )
        )
        .limit(1);
      if (existing[0]) return existing[0].order_index;
      const orderIndex = await nextOrderIndex(tx, collection.id);
      await tx.insert(collection_items).values({
        collection_id: collection.id,
        puzzle_id: puzzleId,
        order_index: orderIndex
      });
      return orderIndex;
    });

    yield* refreshListedCollections();
    return { order_index };
  });

const puzzle_links_input = z.object({
  puzzle_id: z.number().int(),
  tag_slugs: z.array(tag_slug_schema).max(40),
  collection_uids: z.array(z.string().min(1).max(32)).max(40)
});

/**
 * Replaces one puzzle's tags and collection membership. New memberships are appended to the
 * end of each collection; existing ones keep their position. Returns false on an unknown
 * collection uid.
 */
const applyPuzzleLinks = async (
  tx: DbTransaction,
  { puzzle_id, tag_slugs, collection_uids }: z.infer<typeof puzzle_links_input>
) => {
  const tagSlugs = [...new Set(tag_slugs)];
  const collectionUids = [...new Set(collection_uids)];

  const resolvedTags = await ensureTagsBySlugs(tx, tagSlugs);
  const tagIds = resolvedTags.map((tag) => tag.id);

  const foundCollections =
    collectionUids.length === 0
      ? []
      : await tx
          .select({ id: collections.id, uid: collections.uid })
          .from(collections)
          .where(inArray(collections.uid, collectionUids));
  if (foundCollections.length !== collectionUids.length) return false;

  const desiredCollectionIds = new Set(foundCollections.map((row) => row.id));
  await tx.delete(puzzle_tags).where(eq(puzzle_tags.puzzle_id, puzzle_id));
  if (tagIds.length > 0) {
    await tx.insert(puzzle_tags).values(tagIds.map((tag_id) => ({ puzzle_id, tag_id })));
  }
  const current = await tx
    .select({ collection_id: collection_items.collection_id })
    .from(collection_items)
    .where(eq(collection_items.puzzle_id, puzzle_id));
  for (const row of current) {
    if (!desiredCollectionIds.has(row.collection_id)) {
      await tx
        .delete(collection_items)
        .where(
          and(
            eq(collection_items.puzzle_id, puzzle_id),
            eq(collection_items.collection_id, row.collection_id)
          )
        );
    }
  }
  const currentIds = new Set(current.map((row) => row.collection_id));
  for (const collectionId of desiredCollectionIds) {
    if (currentIds.has(collectionId)) continue;
    const orderIndex = await nextOrderIndex(tx, collectionId);
    await tx.insert(collection_items).values({
      collection_id: collectionId,
      puzzle_id,
      order_index: orderIndex
    });
  }
  return true;
};

const set_puzzle_links_route = protectedAdminProcedure
  .input(puzzle_links_input.extend({ game: z.enum(GAME_KINDS) }))
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const puzzle = yield* dbRunHttp('catalog.find_puzzle_for_links', (client) =>
          client
            .select({ id: puzzles.id })
            .from(puzzles)
            .where(and(eq(puzzles.id, input.puzzle_id), eq(puzzles.kind, input.game)))
            .limit(1)
        );
        if (!puzzle[0]) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'puzzle', message: 'Puzzle not found' })
          );
        }

        const linked = yield* dbTransaction('catalog.set_puzzle_links', (tx) =>
          applyPuzzleLinks(tx, input)
        );
        if (!linked) {
          return yield* Effect.fail(BadRequestError.make({ message: 'Unknown collection' }));
        }

        yield* refreshListedPuzzles(input.game);
        yield* refreshListedCollections();
        return { success: true as const };
      })
    )
  );

/** Same as `set_puzzle_links` for many puzzles of one game, in a single transaction. */
const set_puzzle_links_batch_route = protectedAdminProcedure
  .input(
    z.object({
      game: z.enum(GAME_KINDS),
      items: z.array(puzzle_links_input).min(1).max(500)
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const items = [...new Map(input.items.map((item) => [item.puzzle_id, item])).values()];
        const puzzleIds = items.map((item) => item.puzzle_id);
        const found = yield* dbRunHttp('catalog.find_puzzles_for_links', (client) =>
          client
            .select({ id: puzzles.id })
            .from(puzzles)
            .where(and(inArray(puzzles.id, puzzleIds), eq(puzzles.kind, input.game)))
        );
        if (found.length !== puzzleIds.length) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'puzzle', message: 'Puzzle not found' })
          );
        }

        const collectionUids = [...new Set(items.flatMap((item) => item.collection_uids))];
        const knownCollections =
          collectionUids.length === 0
            ? []
            : yield* dbRunHttp('catalog.find_collections_for_links', (client) =>
                client
                  .select({ id: collections.id })
                  .from(collections)
                  .where(inArray(collections.uid, collectionUids))
              );
        if (knownCollections.length !== collectionUids.length) {
          return yield* Effect.fail(BadRequestError.make({ message: 'Unknown collection' }));
        }

        yield* dbTransaction('catalog.set_puzzle_links_batch', async (tx) => {
          for (const item of items) {
            // Throwing rolls back every puzzle's links (only if a collection vanished mid-save).
            if (!(await applyPuzzleLinks(tx, item))) throw new Error('Unknown collection');
          }
        });

        yield* refreshListedPuzzles(input.game);
        yield* refreshListedCollections();
        return { updated: items.length };
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
            const puzzle = await tx
              .select({ id: puzzles.id })
              .from(puzzles)
              .where(and(eq(puzzles.id, item.puzzle_id), eq(puzzles.kind, item.game)))
              .limit(1);
            if (!puzzle[0]) continue;

            const existing = await tx
              .select({ puzzle_id: collection_items.puzzle_id })
              .from(collection_items)
              .where(
                and(
                  eq(collection_items.collection_id, collection.id),
                  eq(collection_items.puzzle_id, item.puzzle_id)
                )
              )
              .limit(1);
            if (existing[0]) continue;
            const orderIndex = await nextOrderIndex(tx, collection.id);
            await tx.insert(collection_items).values({
              collection_id: collection.id,
              puzzle_id: item.puzzle_id,
              order_index: orderIndex
            });
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
        // Membership rows are shared now — confirm the row belongs to this game first.
        const [item] = yield* dbRunHttp('catalog.find_collection_item', (client) =>
          client
            .select({ kind: puzzles.kind })
            .from(collection_items)
            .innerJoin(puzzles, eq(puzzles.id, collection_items.puzzle_id))
            .where(
              and(
                eq(collection_items.collection_id, collection.id),
                eq(collection_items.puzzle_id, input.puzzle_id)
              )
            )
            .limit(1)
        );
        if (!item || !isGameKind(item.kind) || item.kind !== input.game) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'collection', message: 'Collection item not found' })
          );
        }
        yield* dbRunHttp('catalog.remove_collection_item', async (client) => {
          await client
            .delete(collection_items)
            .where(
              and(
                eq(collection_items.collection_id, collection.id),
                eq(collection_items.puzzle_id, input.puzzle_id)
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
          const rows = await tx
            .select({ puzzle_id: collection_items.puzzle_id, kind: puzzles.kind })
            .from(collection_items)
            .innerJoin(puzzles, eq(puzzles.id, collection_items.puzzle_id))
            .where(eq(collection_items.collection_id, collection.id));
          const current = new Set(rows.map((row) => `${row.kind}:${row.puzzle_id}`));
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
            await tx
              .update(collection_items)
              .set({ order_index: index + 1 })
              .where(
                and(
                  eq(collection_items.collection_id, collection.id),
                  eq(collection_items.puzzle_id, item.puzzle_id)
                )
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
        return yield* dbRunHttp('catalog.puzzle_collections', (client) =>
          client
            .select({
              id: collections.id,
              uid: collections.uid,
              slug: collections.slug,
              title: collections.title,
              order_index: collection_items.order_index
            })
            .from(collection_items)
            .innerJoin(collections, eq(collections.id, collection_items.collection_id))
            .innerJoin(
              puzzles,
              and(eq(puzzles.id, collection_items.puzzle_id), eq(puzzles.kind, input.game))
            )
            .where(eq(collection_items.puzzle_id, input.puzzle_id))
            .orderBy(asc(collections.title))
        );
      })
    )
  );

/** Reads puzzles' game data and normalizes it into displayable entries, keyed by puzzle id. */
const loadPuzzleEntries = (game: GameKind, puzzleIds: number[]) =>
  dbRunHttp(`catalog.puzzle_entries.${game}`, async (client) => {
    const byId = new Map<number, PuzzleEntries>();
    if (puzzleIds.length === 0) return byId;
    switch (game) {
      case 'padavali': {
        const rows = await client
          .select({ id: padavali_puzzles.id, word_list: padavali_puzzles.word_list })
          .from(padavali_puzzles)
          .where(inArray(padavali_puzzles.id, puzzleIds));
        for (const row of rows) byId.set(row.id, padavaliEntries(row.word_list));
        break;
      }
      case 'padajala': {
        const rows = await client
          .select({ id: padajala_puzzles.id, word_list: padajala_puzzles.word_list })
          .from(padajala_puzzles)
          .where(inArray(padajala_puzzles.id, puzzleIds));
        for (const row of rows) byId.set(row.id, padajalaEntries(row.word_list));
        break;
      }
      case 'dvayi': {
        const rows = await client
          .select({ id: dvayi_puzzles.id, data: dvayi_puzzles.puzzle_data })
          .from(dvayi_puzzles)
          .where(inArray(dvayi_puzzles.id, puzzleIds));
        for (const row of rows) byId.set(row.id, dvayiEntries(row.data));
        break;
      }
      case 'bhramita': {
        const rows = await client
          .select({ id: bhramita_puzzles.id, data: bhramita_puzzles.puzzle_data })
          .from(bhramita_puzzles)
          .where(inArray(bhramita_puzzles.id, puzzleIds));
        for (const row of rows) byId.set(row.id, wordEntries(row.data));
        break;
      }
      case 'surupa': {
        const rows = await client
          .select({ id: surupa_puzzles.id, data: surupa_puzzles.puzzle_data })
          .from(surupa_puzzles)
          .where(inArray(surupa_puzzles.id, puzzleIds));
        for (const row of rows) byId.set(row.id, wordEntries(row.data));
        break;
      }
      case 'anveshi': {
        const rows = await client
          .select({ id: anveshi_puzzles.id, data: anveshi_puzzles.puzzle_data })
          .from(anveshi_puzzles)
          .where(inArray(anveshi_puzzles.id, puzzleIds));
        for (const row of rows) byId.set(row.id, anveshiEntries(row.data));
        break;
      }
    }
    return byId;
  });

/** Entries for many puzzles at once — backs the full-list text export. */
const puzzle_entries_batch_route = protectedAdminProcedure
  .input(
    z.object({
      game: z.enum(GAME_KINDS),
      puzzle_ids: z.array(z.number().int()).max(5000)
    })
  )
  .query(({ input }) =>
    runTrpcEffect(
      loadPuzzleEntries(input.game, input.puzzle_ids).pipe(
        Effect.map((byId) => Object.fromEntries(byId))
      )
    )
  );

const puzzle_details_route = protectedAdminProcedure
  .input(z.object({ game: z.enum(GAME_KINDS), puzzle_id: z.number().int() }))
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const { content, tagRows, collectionRows } = yield* Effect.all({
          content: loadPuzzleEntries(input.game, [input.puzzle_id]).pipe(
            Effect.map((byId) => byId.get(input.puzzle_id))
          ),
          tagRows: dbRunHttp('catalog.puzzle_details_tags', (client) =>
            client
              .select({ id: tags.id, slug: tags.slug })
              .from(puzzle_tags)
              .innerJoin(tags, eq(tags.id, puzzle_tags.tag_id))
              .where(eq(puzzle_tags.puzzle_id, input.puzzle_id))
              .orderBy(asc(tags.slug))
          ),
          collectionRows: dbRunHttp('catalog.puzzle_details_collections', (client) =>
            client
              .select({
                id: collections.id,
                uid: collections.uid,
                title: collections.title,
                listed: collections.listed
              })
              .from(collection_items)
              .innerJoin(collections, eq(collections.id, collection_items.collection_id))
              .where(eq(collection_items.puzzle_id, input.puzzle_id))
              .orderBy(asc(collections.title))
          )
        });
        if (!content) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: `${input.game}_puzzle`, message: 'Puzzle not found' })
          );
        }
        return { ...content, tags: tagRows, collections: collectionRows };
      })
    )
  );

const search_puzzles_route = protectedAdminProcedure
  .input(
    z.object({
      query: z.string().max(200).default(''),
      tag_slug: z.string().min(1).max(80).optional(),
      kinds: z.array(z.enum(GAME_KINDS)).optional(),
      game: z.enum(['all', ...GAME_KINDS]).default('all'),
      limit: z.number().int().min(1).max(60).default(36),
      exclude_collection_id: z.number().int().optional()
    })
  )
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const games: GameKind[] =
          input.kinds && input.kinds.length > 0
            ? input.kinds
            : input.game === 'all'
              ? [...GAME_KINDS]
              : [input.game];
        const tokens = tokenizeSearchQuery(input.query);
        const conditions = [inArray(puzzles.kind, games)];
        for (const token of tokens) {
          const pattern = `%${escapeIlikeToken(token)}%`;
          conditions.push(or(ilike(puzzles.title, pattern), ilike(puzzles.description, pattern))!);
        }
        if (input.tag_slug) {
          conditions.push(sql`exists (
            select 1 from puzzle_tags pt
            inner join tags t on t.id = pt.tag_id
            where pt.puzzle_id = ${puzzles.id} and t.slug = ${input.tag_slug}
          )`);
        }
        if (input.exclude_collection_id !== undefined) {
          const collectionId = input.exclude_collection_id;
          conditions.push(sql`not exists (
            select 1 from collection_items ci
            where ci.puzzle_id = ${puzzles.id} and ci.collection_id = ${collectionId}
          )`);
        }
        const rows = yield* dbRunHttp('catalog.search_puzzles', (client) =>
          client
            .select({
              id: puzzles.id,
              kind: puzzles.kind,
              slug: puzzles.slug,
              title: puzzles.title,
              description: puzzles.description,
              listed: puzzles.listed,
              created_at: puzzles.created_at,
              image_s3_key: image_assets.s3_key
            })
            .from(puzzles)
            .leftJoin(image_assets, eq(image_assets.id, puzzles.image_id))
            .where(and(...conditions))
            .orderBy(desc(puzzles.created_at))
            .limit(input.limit)
        );
        return rows.map(({ image_s3_key, created_at: _created_at, kind, ...row }) => ({
          ...row,
          game: kind,
          image: image_s3_key ? { s3_key: image_s3_key } : null
        }));
      })
    )
  );

const delete_collection_route = protectedAdminProcedure
  .input(z.object({ uid: z.string().min(1) }))
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const collection = yield* findCollectionByUid(input.uid);
        if (!collection) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'collection', message: 'Collection not found' })
          );
        }
        const counts = yield* dbRunHttp('catalog.count_collection_items', async (client) => {
          const rows = await client
            .select({ kind: puzzles.kind, count: count() })
            .from(collection_items)
            .innerJoin(puzzles, eq(puzzles.id, collection_items.puzzle_id))
            .where(eq(collection_items.collection_id, collection.id))
            .groupBy(puzzles.kind);
          const totals = {
            padavali: 0,
            padajala: 0,
            dvayi: 0,
            bhramita: 0,
            surupa: 0,
            anveshi: 0
          } satisfies Record<GameKind, number>;
          for (const row of rows) {
            if (!isGameKind(row.kind)) continue;
            totals[row.kind] = Number(row.count);
          }
          return totals;
        });
        const padavali = counts.padavali;
        const padajala = counts.padajala;
        const total = GAME_KINDS.reduce((sum, game) => sum + counts[game], 0);
        yield* dbTransaction('catalog.delete_collection', async (tx) => {
          await lockCollectionOrder(tx);
          await tx.delete(collections).where(eq(collections.id, collection.id));
          await compactCollectionOrder(tx);
        });
        yield* refreshListedCollections();
        // Membership rows cascade; puzzles and cover images are never deleted here.
        return { success: true as const, padavali, padajala, total };
      })
    )
  );

/**
 * Rewrite the public order: `ids` (listed only) get 1..n, the rest become unordered.
 * `expected` is the order the editor started from; a mismatch means someone else changed it
 * meanwhile, so the whole-list write is refused instead of silently overwriting that change.
 */
const reorder_collections_route = protectedAdminProcedure
  .input(
    z.object({
      ids: z.array(z.number().int()).max(1000),
      expected: z.array(z.number().int()).max(1000)
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        if (new Set(input.ids).size !== input.ids.length) {
          return yield* Effect.fail(
            BadRequestError.make({ message: 'Duplicate collections in order' })
          );
        }
        const result = yield* dbTransaction('catalog.reorder_collections', async (tx) => {
          await lockCollectionOrder(tx);
          const current = await orderedCollectionIds(tx);
          if (
            current.length !== input.expected.length ||
            current.some((id, index) => id !== input.expected[index])
          ) {
            return { ok: false as const, reason: 'changed' as const };
          }
          if (input.ids.length > 0) {
            const rows = await tx
              .select({ id: collections.id })
              .from(collections)
              .where(and(inArray(collections.id, input.ids), eq(collections.listed, true)));
            if (rows.length !== input.ids.length) {
              return { ok: false as const, reason: 'not_listed' as const };
            }
          }
          await writeCollectionOrder(tx, input.ids);
          return { ok: true as const };
        });
        if (!result.ok) {
          return yield* Effect.fail(
            ConflictError.make({
              message:
                result.reason === 'changed'
                  ? 'The order was changed elsewhere meanwhile — reopen Reorder and retry'
                  : 'Some collections are no longer listed — reopen Reorder and retry'
            })
          );
        }
        yield* refreshListedCollections();
        return { success: true as const };
      })
    )
  );

const delete_tag_route = protectedAdminProcedure
  .input(z.object({ tag_id: z.number().int() }))
  .mutation(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const [tag] = yield* dbRunHttp('catalog.find_tag_for_delete', (client) =>
          client
            .select({ id: tags.id, slug: tags.slug })
            .from(tags)
            .where(eq(tags.id, input.tag_id))
            .limit(1)
        );
        if (!tag) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'tag', message: 'Tag not found' })
          );
        }
        const previous = yield* loadTagPuzzleRefs(tag.id);
        const padavali = previous.filter((item) => item.game === 'padavali').length;
        const padajala = previous.filter((item) => item.game === 'padajala').length;
        const total = previous.length;
        yield* dbRunHttp('catalog.delete_tag', async (client) => {
          await client.delete(tags).where(eq(tags.id, input.tag_id));
        });
        yield* refreshPublicCachesForTagPuzzles(previous);
        // Tag links cascade; puzzles themselves are never deleted here.
        return { success: true as const, padavali, padajala, total };
      })
    )
  );

export const catalog_router = t.router({
  list_tags: list_tags_route,
  connected_games: connected_games_route,
  get_tag: get_tag_route,
  create_tag: create_tag_route,
  save_tag: save_tag_route,
  puzzle_tags: puzzle_tags_route,
  attach_tag: attach_tag_route,
  detach_tag: detach_tag_route,
  delete_tag: delete_tag_route,
  list_collections: list_collections_route,
  create_collection: create_collection_route,
  get_collection: get_collection_route,
  update_collection: update_collection_route,
  save_collection: save_collection_route,
  delete_collection: delete_collection_route,
  reorder_collections: reorder_collections_route,
  set_puzzle_links: set_puzzle_links_route,
  set_puzzle_links_batch: set_puzzle_links_batch_route,
  add_items: add_items_route,
  add_item: add_item_route,
  remove_item: remove_item_route,
  reorder: reorder_route,
  puzzle_collections: puzzle_collections_route,
  puzzle_details: puzzle_details_route,
  puzzle_entries_batch: puzzle_entries_batch_route,
  search_puzzles: search_puzzles_route
});

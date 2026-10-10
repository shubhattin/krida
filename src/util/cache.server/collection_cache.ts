import { Effect } from 'effect';
import { z } from 'zod';
import { image_schema } from '~/db/db_shared_vals';
import { createCache, type CacheItem, type NoCacheParams } from '~/effect/cache';
import { dbRunHttp } from '~/effect/database';
import { CacheError } from '~/effect/errors';
import { GAME_KINDS, type GameKind } from '~/util/catalog/tags';

const collection_item_schema = z.object({
  game: z.enum(GAME_KINDS),
  puzzle_id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  order_index: z.number().int(),
  image: image_schema.nullable()
});

const listed_collection_schema = z.object({
  id: z.number().int(),
  uid: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  image: image_schema.nullable(),
  items: collection_item_schema.array()
});

export type ListedCollectionItem = z.infer<typeof collection_item_schema>;
export type ListedCollectionsType = z.infer<typeof listed_collection_schema>[];

const LISTED_COLLECTIONS_KEY = 'catalog:listed_collections';

export const collectionCacheKeys = {
  listed_collections: () => LISTED_COLLECTIONS_KEY
} as const;

const imageColumns = {
  id: true,
  s3_key: true,
  width: true,
  height: true
} as const;

const toCacheError = (operation: string, key: string) => (cause: unknown) =>
  CacheError.make({ operation, key, cause });

type ItemPuzzle = {
  id: number;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  image: ListedCollectionItem['image'];
};

const toPublicItems = (
  game: GameKind,
  rows: { order_index: number; puzzle: ItemPuzzle }[]
): ListedCollectionItem[] =>
  rows.flatMap((row) =>
    row.puzzle.listed
      ? [
          {
            game,
            puzzle_id: row.puzzle.id,
            slug: row.puzzle.slug,
            title: row.puzzle.title,
            description: row.puzzle.description,
            order_index: row.order_index,
            image: row.puzzle.image
          }
        ]
      : []
  );

const load_listed_collections: CacheItem<NoCacheParams, ListedCollectionsType> = createCache({
  getKey: () => LISTED_COLLECTIONS_KEY,
  schema: listed_collection_schema.array(),
  fetch: () =>
    dbRunHttp('catalog.listed_collections', (client) =>
      client.query.collections.findMany({
        columns: {
          id: true,
          uid: true,
          slug: true,
          title: true,
          description: true
        },
        where: (tbl, { eq }) => eq(tbl.listed, true),
        orderBy: (tbl, { desc }) => desc(tbl.created_at),
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
                with: { image: { columns: imageColumns } }
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
                with: { image: { columns: imageColumns } }
              }
            }
          }
        }
      })
    ).pipe(
      Effect.map((rows) =>
        rows.map((row) => ({
          id: row.id,
          uid: row.uid,
          slug: row.slug,
          title: row.title,
          description: row.description,
          image: row.image,
          // TODO: include dvayi/bhramita/surupa/anveshi items here once those
          // games ship on /puzzles. Admin collections already persist them.
          items: [
            ...toPublicItems('padavali', row.padavali_items),
            ...toPublicItems('crossword', row.crossword_items)
          ].sort((a, b) => a.order_index - b.order_index || a.puzzle_id - b.puzzle_id)
        }))
      ),
      Effect.mapError(toCacheError('fetchListedCollections', LISTED_COLLECTIONS_KEY))
    )
});

export type CollectionCacheLoaders = {
  listed_collections: CacheItem<NoCacheParams, ListedCollectionsType>;
};

export const collection_cache_loaders: CollectionCacheLoaders = {
  listed_collections: load_listed_collections
};

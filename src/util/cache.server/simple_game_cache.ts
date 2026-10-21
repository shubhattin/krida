import { Effect } from 'effect';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { attachment_schema, image_schema } from '~/db/db_shared_vals';
import { image_assets, puzzle_attachments, puzzles } from '~/db/schema';
import { createCache, type CacheItem, type NoCacheParams } from '~/effect/cache';
import { dbRunHttp } from '~/effect/database';
import { CacheError } from '~/effect/errors';
import { public_tag_schema } from '~/util/catalog/tags';
import { tagsForPuzzleIds } from '~/util/catalog/list_query';
import type { SimpleGameKind } from '~/util/games/kinds';
import type { SimpleGameTableSet } from '~/db/schema/simple_game_tables';

const listed_puzzle_schema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  tags: public_tag_schema.array(),
  /** Cover image; optional so cache entries written before covers existed still validate. */
  image: image_schema.nullable().optional(),
  last_listed_at: z.coerce.date().nullable().optional(),
  updated_at: z.coerce.date().nullable().optional(),
  created_at: z.coerce.date().nullable().optional()
});

export type SimpleListedPuzzle = z.infer<typeof listed_puzzle_schema>;

export function simpleGamePuzzleSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    id: z.number().int(),
    uid: z.string(),
    slug: z.string(),
    title: z.string(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date().nullable().optional(),
    listed: z.boolean(),
    description: z.string(),
    puzzle_data: dataSchema,
    image: image_schema.nullable().optional(),
    attachments: z.array(attachment_schema)
  });
}

export type SimpleGamePuzzle<T> = {
  id: number;
  uid: string;
  slug: string;
  title: string;
  created_at: Date;
  updated_at?: Date | null;
  listed: boolean;
  description: string;
  puzzle_data: T;
  image?: z.infer<typeof image_schema> | null;
  attachments: z.infer<typeof attachment_schema>[];
};

const imageColumns = {
  image_id: image_assets.id,
  image_s3_key: image_assets.s3_key,
  image_width: image_assets.width,
  image_height: image_assets.height
};

type ImageColumns = {
  image_id: number | null;
  image_s3_key: string | null;
  image_width: number | null;
  image_height: number | null;
};

/** Split the left-joined image columns back into `image` (null when the puzzle has none). */
function withImage<R extends ImageColumns>(row: R) {
  const { image_id, image_s3_key, image_width, image_height, ...rest } = row;
  const image =
    image_id !== null && image_s3_key !== null && image_width !== null && image_height !== null
      ? { id: image_id, s3_key: image_s3_key, width: image_width, height: image_height }
      : null;
  return { ...rest, image };
}

export type SimpleGamePuzzleParams = { slug: string };

export type SimpleGameCacheLoaders<T> = {
  listed_puzzle_list: CacheItem<NoCacheParams, SimpleListedPuzzle[]>;
  word_puzzle: CacheItem<SimpleGamePuzzleParams, SimpleGamePuzzle<T> | undefined>;
};

export function createSimpleGameCacheLoaders<T>(
  kind: SimpleGameKind,
  tables: SimpleGameTableSet<T>,
  dataSchema: z.ZodType<T>
): SimpleGameCacheLoaders<T> {
  const puzzleSchema = simpleGamePuzzleSchema(dataSchema);
  const listedKey = `${kind}:listed_puzzle_list`;
  const wordPuzzleKey = (slug: string) => `${kind}:word_puzzle:${slug}`;
  const toCacheError = (operation: string, key: string) => (cause: unknown) =>
    CacheError.make({ operation, key, cause });

  const listed_puzzle_list: CacheItem<NoCacheParams, SimpleListedPuzzle[]> = createCache({
    getKey: () => listedKey,
    schema: listed_puzzle_schema.array(),
    fetch: () =>
      dbRunHttp(`${kind}.listed_puzzle_list`, (client) =>
        client
          .select({
            id: puzzles.id,
            slug: puzzles.slug,
            title: puzzles.title,
            description: puzzles.description,
            last_listed_at: puzzles.last_listed_at,
            updated_at: puzzles.updated_at,
            created_at: puzzles.created_at,
            ...imageColumns
          })
          .from(puzzles)
          .innerJoin(tables.puzzles, eq(tables.puzzles.id, puzzles.id))
          .leftJoin(image_assets, eq(image_assets.id, puzzles.image_id))
          .where(and(eq(puzzles.kind, kind), eq(puzzles.listed, true)))
          .orderBy(
            sql`COALESCE(${puzzles.last_listed_at}, ${puzzles.updated_at}, ${puzzles.created_at}) DESC`,
            sql`${puzzles.created_at} DESC`,
            sql`${puzzles.id} DESC`
          )
      ).pipe(
        Effect.flatMap((rows) =>
          tagsForPuzzleIds(
            kind,
            // SAFETY: listed rows always select serial puzzle ids from this game's table.
            rows.map((row) => row.id as number)
          ).pipe(
            Effect.map((tagsByPuzzle) =>
              rows.map((row) => {
                const puzzle = withImage(row);
                // SAFETY: selected listed columns plus tags match SimpleListedPuzzle.
                const listed: SimpleListedPuzzle = {
                  ...puzzle,
                  // SAFETY: listed rows always select serial puzzle ids from this game's table.
                  tags: tagsByPuzzle.get(puzzle.id as number) ?? []
                };
                return listed;
              })
            )
          )
        ),
        Effect.mapError(toCacheError('fetchListedPuzzleList', listedKey))
      )
  });

  const word_puzzle: CacheItem<SimpleGamePuzzleParams, SimpleGamePuzzle<T> | undefined> =
    createCache<SimpleGamePuzzleParams, SimpleGamePuzzle<T> | undefined>({
      getKey: ({ slug }) => wordPuzzleKey(slug),
      // SAFETY: createCache stores undefined for misses; puzzleSchema already
      // validates the present SimpleGamePuzzle<T> payload.
      schema: puzzleSchema as z.ZodType<SimpleGamePuzzle<T> | undefined>,
      shouldCache: (data) => data !== undefined,
      fetch: ({ slug }) =>
        dbRunHttp(`${kind}.word_puzzle`, async (client) => {
          const [row] = await client
            .select({
              id: puzzles.id,
              uid: puzzles.uid,
              slug: puzzles.slug,
              title: puzzles.title,
              created_at: puzzles.created_at,
              updated_at: puzzles.updated_at,
              listed: puzzles.listed,
              description: puzzles.description,
              puzzle_data: tables.puzzles.puzzle_data,
              ...imageColumns
            })
            .from(puzzles)
            .innerJoin(tables.puzzles, eq(tables.puzzles.id, puzzles.id))
            .leftJoin(image_assets, eq(image_assets.id, puzzles.image_id))
            .where(and(eq(puzzles.kind, kind), eq(puzzles.slug, slug)))
            .limit(1);
          if (!row) return undefined;
          const puzzle = withImage(row);
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
          // SAFETY: selected puzzle columns plus attachments match SimpleGamePuzzle<T>.
          const wordPuzzle: SimpleGamePuzzle<T> = { ...puzzle, attachments };
          return wordPuzzle;
        }).pipe(Effect.mapError(toCacheError('fetchWordPuzzle', wordPuzzleKey(slug))))
    });

  return { listed_puzzle_list, word_puzzle };
}

export const simpleGameCacheKeys = (kind: SimpleGameKind) => ({
  listed_puzzle_list: () => `${kind}:listed_puzzle_list`,
  word_puzzle: (slug: string) => `${kind}:word_puzzle:${slug}`
});

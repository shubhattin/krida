import { Effect } from 'effect';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { attachment_schema } from '~/db/db_shared_vals';
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
  attachments: z.infer<typeof attachment_schema>[];
};

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
            id: tables.puzzles.id,
            slug: tables.puzzles.slug,
            title: tables.puzzles.title,
            description: tables.puzzles.description,
            last_listed_at: tables.puzzles.last_listed_at,
            updated_at: tables.puzzles.updated_at,
            created_at: tables.puzzles.created_at
          })
          .from(tables.puzzles)
          .where(eq(tables.puzzles.listed, true))
          .orderBy(
            sql`COALESCE(${tables.puzzles.last_listed_at}, ${tables.puzzles.updated_at}, ${tables.puzzles.created_at}) DESC`,
            sql`${tables.puzzles.created_at} DESC`,
            sql`${tables.puzzles.id} DESC`
          )
      ).pipe(
        Effect.flatMap((rows) =>
          tagsForPuzzleIds(
            kind,
            // SAFETY: listed rows always select serial puzzle ids from this game's table.
            rows.map((row) => row.id as number)
          ).pipe(
            Effect.map((tagsByPuzzle) =>
              rows.map((puzzle) => {
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
          const [puzzle] = await client
            .select({
              id: tables.puzzles.id,
              uid: tables.puzzles.uid,
              slug: tables.puzzles.slug,
              title: tables.puzzles.title,
              created_at: tables.puzzles.created_at,
              updated_at: tables.puzzles.updated_at,
              listed: tables.puzzles.listed,
              description: tables.puzzles.description,
              puzzle_data: tables.puzzles.puzzle_data
            })
            .from(tables.puzzles)
            .where(eq(tables.puzzles.slug, slug))
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
            .where(eq(tables.attachments.puzzle_id, puzzle.id))
            .orderBy(tables.attachments.order_index);
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

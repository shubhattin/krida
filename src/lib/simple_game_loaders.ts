import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { collections, tags } from '~/db/schema';
import { adminServerFnMiddleware } from '~/lib/adminServerFn';
import { dbRunHttp } from '~/effect/database';
import { runLoaderEffect } from '~/effect/run';
import { SIMPLE_GAME_TABLES } from '~/util/catalog/simple_game_tables';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import type { SimpleGameCacheLoaders, SimpleGamePuzzle } from '~/util/cache.server/simple_game_cache';
import type { AnveshiPuzzleData } from '~/util/anveshi/data';
import type { BhramitaPuzzleData } from '~/util/bhramita/data';
import type { DvayiPuzzleData } from '~/util/dvayi/data';
import type { SurupaPuzzleData } from '~/util/surupa/data';
import { type SimpleGameKind } from '~/util/games/kinds';

type AnySimplePuzzleData =
  | DvayiPuzzleData
  | BhramitaPuzzleData
  | SurupaPuzzleData
  | AnveshiPuzzleData;

type PublicSimplePuzzle = SimpleGamePuzzle<AnySimplePuzzleData>;

const kind_schema = z.enum(['dvayi', 'bhramita', 'surupa', 'anveshi']);

function tablesFor(kind: SimpleGameKind) {
  return SIMPLE_GAME_TABLES[kind];
}

export type SimpleGameSlugResolution =
  | { type: 'puzzle'; puzzle: NonNullable<Awaited<ReturnType<typeof loadCachedPuzzle>>> }
  | { type: 'redirect'; targetSlug: string }
  | { type: 'not_found' };

async function loadCachedPuzzle(
  kind: SimpleGameKind,
  slug: string
): Promise<PublicSimplePuzzle | undefined> {
  // SAFETY: CACHE[kind] for SimpleGameKind is always a SimpleGameCacheLoaders;
  // the four games share that loader shape with kind-specific puzzle_data.
  const cache = CACHE[kind] as SimpleGameCacheLoaders<AnySimplePuzzleData>;
  return runLoaderEffect(cache.word_puzzle.get({ slug }));
}

export async function resolveSimpleGameSlug(
  kind: SimpleGameKind,
  slug: string
): Promise<SimpleGameSlugResolution> {
  const puzzle = await loadCachedPuzzle(kind, slug);
  if (puzzle) return { type: 'puzzle', puzzle };

  const tables = tablesFor(kind);
  const [redirect] = await runLoaderEffect(
    dbRunHttp(`${kind}.resolve_puzzle_slug_redirect`, (client) =>
      client
        .select({ targetSlug: tables.puzzles.slug })
        .from(tables.redirects)
        .innerJoin(tables.puzzles, eq(tables.redirects.puzzle_id, tables.puzzles.id))
        .where(eq(tables.redirects.slug, slug))
        .limit(1)
    )
  );
  if (redirect?.targetSlug) return { type: 'redirect', targetSlug: redirect.targetSlug };
  return { type: 'not_found' };
}

export const loadSimpleGameEdit$ = createServerFn({ method: 'GET' })
  .middleware([adminServerFnMiddleware])
  .validator(z.object({ kind: kind_schema, rawId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const parsed = z.coerce.number().int().safeParse(data.rawId);
    if (!parsed.success) return { puzzle: null, catalog: { tags: [], collections: [] } };

    const tables = tablesFor(data.kind);
    const puzzleId = parsed.data;

    const [puzzle] = await runLoaderEffect(
      dbRunHttp(`${data.kind}.admin.get_edit_puzzle`, (client) =>
        client
          .select({
            id: tables.puzzles.id,
            uid: tables.puzzles.uid,
            slug: tables.puzzles.slug,
            title: tables.puzzles.title,
            description: tables.puzzles.description,
            listed: tables.puzzles.listed,
            puzzle_data: tables.puzzles.puzzle_data
          })
          .from(tables.puzzles)
          .where(eq(tables.puzzles.id, puzzleId))
          .limit(1)
      )
    );
    if (!puzzle) return { puzzle: null, catalog: { tags: [], collections: [] } };

    const [attachments, tagRows, collectionRows] = await Promise.all([
      runLoaderEffect(
        dbRunHttp(`${data.kind}.admin.get_edit_attachments`, (client) =>
          client
            .select({
              id: tables.attachments.id,
              type: tables.attachments.type,
              url: tables.attachments.url,
              title: tables.attachments.title,
              order_index: tables.attachments.order_index
            })
            .from(tables.attachments)
            .where(eq(tables.attachments.puzzle_id, puzzleId))
            .orderBy(tables.attachments.order_index)
        )
      ),
      runLoaderEffect(
        dbRunHttp(`${data.kind}.admin.get_edit_tags`, (client) =>
          client
            .select({ id: tags.id, slug: tags.slug })
            .from(tables.puzzle_tags)
            .innerJoin(tags, eq(tables.puzzle_tags.tag_id, tags.id))
            .where(eq(tables.puzzle_tags.puzzle_id, puzzleId))
        )
      ),
      runLoaderEffect(
        dbRunHttp(`${data.kind}.admin.get_edit_collections`, (client) =>
          client
            .select({
              id: collections.id,
              uid: collections.uid,
              slug: collections.slug,
              title: collections.title
            })
            .from(tables.collection_items)
            .innerJoin(collections, eq(tables.collection_items.collection_id, collections.id))
            .where(eq(tables.collection_items.puzzle_id, puzzleId))
        )
      )
    ]);

    return {
      puzzle: { ...puzzle, attachments },
      catalog: {
        tags: tagRows.toSorted((a, b) => a.slug.localeCompare(b.slug)),
        collections: collectionRows.toSorted((a, b) => a.title.localeCompare(b.title))
      }
    };
  });

export const loadSimpleGameBySlug$ = createServerFn({ method: 'GET' })
  .validator(z.object({ kind: kind_schema, slug: z.string() }))
  .handler(async ({ data }) => {
    const resolution = await resolveSimpleGameSlug(data.kind, data.slug);
    if (resolution.type === 'redirect') {
      return { kind: 'redirect' as const, targetSlug: resolution.targetSlug };
    }
    if (resolution.type === 'not_found') {
      return { kind: 'not_found' as const };
    }
    if (!resolution.puzzle.listed) {
      return {
        kind: 'unavailable' as const,
        title: resolution.puzzle.title,
        description: resolution.puzzle.description
      };
    }
    return { kind: 'puzzle' as const, puzzle: resolution.puzzle };
  });

export const loadSimpleGameByUid$ = createServerFn({ method: 'GET' })
  .validator(z.object({ kind: kind_schema, nano_id: z.string() }))
  .handler(async ({ data }) => {
    const tables = tablesFor(data.kind);
    const [row] = await runLoaderEffect(
      dbRunHttp(`${data.kind}.view.resolve_uid`, (client) =>
        client
          .select({ slug: tables.puzzles.slug })
          .from(tables.puzzles)
          .where(eq(tables.puzzles.uid, data.nano_id))
          .limit(1)
      )
    );
    if (!row) return { puzzle: null };
    const puzzle = await loadCachedPuzzle(data.kind, row.slug);
    return { puzzle: puzzle ?? null };
  });

export const loadSimpleGameListed$ = createServerFn({ method: 'GET' })
  .validator(z.object({ kind: kind_schema }))
  .handler(async ({ data }) => {
    const list = await runLoaderEffect(CACHE[data.kind].listed_puzzle_list.get(NO_CACHE_PARAMS));
    return { list };
  });

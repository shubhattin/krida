import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { runLoaderEffect } from '~/effect/run';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import {
  EMPTY_PUZZLE_COLLECTION_CONTEXT,
  resolvePuzzleCollectionContext
} from '~/util/catalog/collection_nav';
import { GAME_KINDS } from '~/util/catalog/tags';

/** Collection breadcrumbs for a public puzzle page; never fails the page itself. */
export const loadPuzzleCollectionContext$ = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      game: z.enum(GAME_KINDS),
      slug: z.string().min(1),
      from: z.string().max(100).optional()
    })
  )
  .handler(async ({ data }) => {
    const collections = await runLoaderEffect(
      CACHE.catalog.listed_collections.get(NO_CACHE_PARAMS)
    ).catch(() => null);
    if (!collections) return EMPTY_PUZZLE_COLLECTION_CONTEXT;
    return resolvePuzzleCollectionContext(collections, data.game, data.slug, data.from);
  });

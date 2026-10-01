import { createServerFn } from '@tanstack/react-start';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { runLoaderEffect } from '~/effect/run';

export type HubNavCollection = { slug: string; title: string };
export type HubNavTag = { slug: string; name: string };

/** Lightweight drawer data for public chrome (no transliteration). */
export type HubNavData = {
  collections: HubNavCollection[];
  tags: HubNavTag[];
};

const TOP_TAG_COUNT = 16;

/**
 * Collections and popular tags for the site drawer.
 * Safe to call from game pages — uses the same listed caches as the hub.
 */
export const hubNavData$ = createServerFn({ method: 'GET' }).handler(
  async (): Promise<HubNavData> => {
    const [collections, padavali, crossword] = await Promise.all([
      runLoaderEffect(CACHE.catalog.listed_collections.get(NO_CACHE_PARAMS)),
      runLoaderEffect(CACHE.padavali.listed_puzzle_list.get(NO_CACHE_PARAMS)),
      runLoaderEffect(CACHE.crossword.listed_puzzle_list.get(NO_CACHE_PARAMS))
    ]);

    const bySlug = new Map<string, HubNavTag & { count: number }>();
    for (const puzzle of [...padavali, ...crossword]) {
      for (const tag of puzzle.tags) {
        const existing = bySlug.get(tag.slug);
        if (existing) existing.count += 1;
        else bySlug.set(tag.slug, { slug: tag.slug, name: tag.name, count: 1 });
      }
    }

    const tags = [...bySlug.values()]
      .toSorted((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
      .slice(0, TOP_TAG_COUNT)
      .map(({ slug, name }) => ({ slug, name }));

    return {
      collections: collections.map((collection) => ({
        slug: collection.slug,
        title: collection.title
      })),
      tags
    };
  }
);

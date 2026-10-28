import { z } from 'zod';
import type {
  ListedCollectionItem,
  ListedCollectionsType
} from '~/util/cache.server/collection_cache';
import type { GameKind } from '~/util/catalog/tags';

/**
 * `?from=<collection slug>` on public puzzle pages: set by links that come from a
 * collection, so the page can lead back to it. Bad values are dropped, not errors.
 */
export const puzzle_page_search_schema = z.object({
  from: z.string().min(1).max(100).optional().catch(undefined)
});

export type CollectionNavItem = Pick<ListedCollectionItem, 'game' | 'slug' | 'title' | 'image'>;

/** Where one puzzle sits in a collection, with its neighbours for prev / next links. */
export type CollectionNav = {
  slug: string;
  title: string;
  /** 1-based. */
  position: number;
  total: number;
  prev: CollectionNavItem | null;
  next: CollectionNavItem | null;
};

export type CollectionMembership = {
  slug: string;
  title: string;
  image: ListedCollectionsType[number]['image'];
  /** Puzzles in the collection. */
  total: number;
};

export type PuzzleCollectionContext = {
  /**
   * The collection to lead the player through: the one in `?from=` when it contains
   * this puzzle, else the only collection the puzzle belongs to.
   */
  nav: CollectionNav | null;
  /** True when `nav` came from `?from=` (the player actually arrived from it). */
  explicit: boolean;
  /** Every listed collection containing this puzzle, in catalog order. */
  memberships: CollectionMembership[];
};

export const EMPTY_PUZZLE_COLLECTION_CONTEXT: PuzzleCollectionContext = {
  nav: null,
  explicit: false,
  memberships: []
};

const toNavItem = (item: ListedCollectionItem | undefined): CollectionNavItem | null =>
  item ? { game: item.game, slug: item.slug, title: item.title, image: item.image } : null;

function navFor(
  collection: ListedCollectionsType[number],
  game: GameKind,
  slug: string
): CollectionNav | null {
  const items = collection.items.toSorted(
    (a, b) => a.order_index - b.order_index || a.puzzle_id - b.puzzle_id
  );
  const index = items.findIndex((item) => item.game === game && item.slug === slug);
  if (index === -1) return null;
  return {
    slug: collection.slug,
    title: collection.title,
    position: index + 1,
    total: items.length,
    prev: toNavItem(items[index - 1]),
    next: toNavItem(items[index + 1])
  };
}

/** Matches by slug, so it can run in parallel with the puzzle lookup itself. */
export function resolvePuzzleCollectionContext(
  collections: ListedCollectionsType,
  game: GameKind,
  slug: string,
  from: string | undefined
): PuzzleCollectionContext {
  const containing = collections.filter((collection) =>
    collection.items.some((item) => item.game === game && item.slug === slug)
  );
  const memberships = containing.map(({ slug, title, image, items }) => ({
    slug,
    title,
    image,
    total: items.length
  }));

  const fromCollection = from ? containing.find((collection) => collection.slug === from) : null;
  if (fromCollection) {
    return { nav: navFor(fromCollection, game, slug), explicit: true, memberships };
  }
  if (containing.length === 1) {
    return { nav: navFor(containing[0]!, game, slug), explicit: false, memberships };
  }
  return { nav: null, explicit: false, memberships };
}

/** Public URL of a puzzle opened from a collection (keeps `?from=` for the next page). */
export const collectionPuzzleHref = (game: GameKind, slug: string, collectionSlug: string) =>
  `/${game}/${encodeURIComponent(slug)}?from=${encodeURIComponent(collectionSlug)}`;

/** `?from=…` suffix for redirects that must keep the collection context. */
export const fromQuery = (from: string | undefined) =>
  from ? `?from=${encodeURIComponent(from)}` : '';

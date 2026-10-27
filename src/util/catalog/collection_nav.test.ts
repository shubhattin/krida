import { describe, expect, it } from 'vitest';
import {
  collectionPuzzleHref,
  EMPTY_PUZZLE_COLLECTION_CONTEXT,
  fromQuery,
  resolvePuzzleCollectionContext
} from './collection_nav';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';

// SAFETY: hand-built fixture mirrors the listed_collections zod schema (same game/slug/item shape).
const collections: ListedCollectionsType = [
  {
    id: 1,
    uid: 'uid-1',
    slug: 'collection-a',
    title: 'Collection A',
    description: '',
    image: null,
    items: [
      {
        game: 'padavali',
        puzzle_id: 1,
        slug: 'puzzle-1',
        title: 'Puzzle 1',
        description: '',
        order_index: 0,
        image: null
      },
      {
        game: 'padavali',
        puzzle_id: 2,
        slug: 'puzzle-2',
        title: 'Puzzle 2',
        description: '',
        order_index: 1,
        image: null
      }
    ]
  },
  {
    id: 2,
    uid: 'uid-2',
    slug: 'collection-b',
    title: 'Collection B',
    description: '',
    image: null,
    items: [
      {
        game: 'padavali',
        puzzle_id: 2,
        slug: 'puzzle-2',
        title: 'Puzzle 2',
        description: '',
        order_index: 0,
        image: null
      }
    ]
  }
];

describe('resolvePuzzleCollectionContext', () => {
  it('resolves explicit from param with neighbours', () => {
    const ctx = resolvePuzzleCollectionContext(collections, 'padavali', 'puzzle-1', 'collection-a');
    expect(ctx.explicit).toBe(true);
    expect(ctx.nav?.slug).toBe('collection-a');
    expect(ctx.nav?.position).toBe(1);
    expect(ctx.nav?.total).toBe(2);
    expect(ctx.nav?.prev).toBeNull();
    expect(ctx.nav?.next?.slug).toBe('puzzle-2');
    expect(ctx.memberships).toHaveLength(1);
  });

  it('falls back to single membership when from is missing', () => {
    const ctx = resolvePuzzleCollectionContext(collections, 'padavali', 'puzzle-1', undefined);
    expect(ctx.explicit).toBe(false);
    expect(ctx.nav?.slug).toBe('collection-a');
  });

  it('returns no nav for ambiguous membership without from', () => {
    const ctx = resolvePuzzleCollectionContext(collections, 'padavali', 'puzzle-2', undefined);
    expect(ctx.nav).toBeNull();
    expect(ctx.explicit).toBe(false);
    expect(ctx.memberships).toHaveLength(2);
  });

  it('ignores unknown from slug', () => {
    const ctx = resolvePuzzleCollectionContext(collections, 'padavali', 'puzzle-2', 'nope');
    expect(ctx).toEqual({ nav: null, explicit: false, memberships: ctx.memberships });
    expect(ctx.memberships).toHaveLength(2);
  });

  it('returns empty context for puzzles in no collection', () => {
    const ctx = resolvePuzzleCollectionContext(collections, 'padavali', 'missing', undefined);
    expect(ctx).toEqual(EMPTY_PUZZLE_COLLECTION_CONTEXT);
  });
});

describe('href helpers', () => {
  it('builds collection puzzle href', () => {
    expect(collectionPuzzleHref('padavali', 'my slug', 'my-collection')).toBe(
      '/padavali/my%20slug?from=my-collection'
    );
  });

  it('builds from query suffix', () => {
    expect(fromQuery(undefined)).toBe('');
    expect(fromQuery('abc')).toBe('?from=abc');
  });
});

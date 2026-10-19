import { describe, expect, it } from 'vitest';
import {
  resolvePuzzleSlug,
  toSlugMap,
  type PuzzleSlugMap
} from '~/util/cache.server/puzzle_slug_map_cache';
import type { GameKind } from '~/util/catalog/tags';
import { GAME_KINDS } from '~/util/catalog/tags';

const buildMap = (
  live: Partial<Record<GameKind, string[]>>,
  redirects: Partial<Record<GameKind, [string, string][]>>
): PuzzleSlugMap =>
  // SAFETY: Object.fromEntries over the exhaustive GAME_KINDS tuple builds exactly one entry per game kind.
  Object.fromEntries(
    GAME_KINDS.map((kind) => [
      kind,
      {
        liveSlugs: new Set(live[kind] ?? []),
        redirectTo: new Map(redirects[kind] ?? [])
      }
    ])
  ) as PuzzleSlugMap;

describe('resolvePuzzleSlug', () => {
  it('resolves live slugs without consulting redirects', () => {
    const map = buildMap({ padavali: ['aavaranam'] }, { padavali: [['aavaranam', 'other']] });
    expect(resolvePuzzleSlug(map, 'padavali', 'aavaranam')).toEqual({ type: 'live' });
  });

  it('resolves old slugs to their redirect target scoped per game', () => {
    const map = buildMap(
      { padavali: ['new-slug'], padajala: ['other'] },
      { padavali: [['old-slug', 'new-slug']] }
    );
    expect(resolvePuzzleSlug(map, 'padavali', 'old-slug')).toEqual({
      type: 'redirect',
      targetSlug: 'new-slug'
    });
    expect(resolvePuzzleSlug(map, 'padajala', 'old-slug')).toEqual({ type: 'unknown' });
  });

  it('returns unknown for slugs seen nowhere', () => {
    const map = buildMap({ padavali: ['aavaranam'] }, {});
    expect(resolvePuzzleSlug(map, 'padavali', 'missing')).toEqual({ type: 'unknown' });
  });

  it('treats a redirect with a non-live target as unknown (stale map)', () => {
    const map = buildMap({ padavali: ['new-slug'] }, { padavali: [['old-slug', 'ghost-slug']] });
    expect(resolvePuzzleSlug(map, 'padavali', 'old-slug')).toEqual({ type: 'unknown' });
  });
});

describe('toSlugMap', () => {
  it('builds per-game live sets and redirect maps', () => {
    const map = toSlugMap({
      live: [
        { kind: 'padavali', slug: 'aavaranam' },
        { kind: 'padajala', slug: 'cross-1' }
      ],
      redirects: [{ kind: 'padavali', slug: 'old-one', target: 'aavaranam' }]
    });
    expect(map.padavali.liveSlugs.has('aavaranam')).toBe(true);
    expect(map.padavali.redirectTo.get('old-one')).toBe('aavaranam');
    expect(map.padajala.liveSlugs.has('cross-1')).toBe(true);
    expect(map.padajala.redirectTo.size).toBe(0);
    expect(map.dvayi.liveSlugs.size).toBe(0);
  });

  it('skips self-target rows and unknown kinds instead of throwing', () => {
    const map = toSlugMap({
      // SAFETY: simulating a foreign/dumped payload row; the loader must skip it, not throw.
      live: [{ kind: 'not-a-game' as GameKind, slug: 'x' }],
      redirects: [
        { kind: 'padavali', slug: 'same', target: 'same' },
        // SAFETY: simulating a foreign/dumped payload row; the loader must skip it, not throw.
        { kind: 'not-a-game' as GameKind, slug: 'y', target: 'z' }
      ]
    });
    expect(map.padavali.redirectTo.has('same')).toBe(false);
    expect(resolvePuzzleSlug(map, 'padavali', 'x')).toEqual({ type: 'unknown' });
  });

  it('models the reclaim flow: redirect deleted, slug live again', () => {
    const before = toSlugMap({
      live: [{ kind: 'padavali', slug: 'aavaranam' }],
      redirects: [{ kind: 'padavali', slug: 'reclaimed', target: 'aavaranam' }]
    });
    expect(resolvePuzzleSlug(before, 'padavali', 'reclaimed')).toEqual({
      type: 'redirect',
      targetSlug: 'aavaranam'
    });
    const after = toSlugMap({
      live: [
        { kind: 'padavali', slug: 'aavaranam' },
        { kind: 'padavali', slug: 'reclaimed' }
      ],
      redirects: []
    });
    expect(resolvePuzzleSlug(after, 'padavali', 'reclaimed')).toEqual({ type: 'live' });
  });
});

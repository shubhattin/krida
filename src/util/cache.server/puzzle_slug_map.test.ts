import { describe, expect, it } from 'vitest';
import { resolvePuzzleSlug, type PuzzleSlugMap } from '~/util/cache.server/puzzle_slug_map_cache';
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
});

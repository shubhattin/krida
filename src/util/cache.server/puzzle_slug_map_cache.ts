import { Effect } from 'effect';
import { z } from 'zod';
import { puzzle_redirects, puzzles } from '~/db/schema';
import { eq } from 'drizzle-orm';
import {
  createCache,
  invalidateAndRefreshCache,
  type CacheItem,
  type NoCacheParams,
  NO_CACHE_PARAMS
} from '~/effect/cache';
import { dbRunHttp } from '~/effect/database';
import { CacheError } from '~/effect/errors';
import { GAME_KINDS, game_kind_schema, isGameKind, type GameKind } from '~/util/catalog/tags';

const SLUG_MAP_KEY = 'puzzle:slug_map';

/** Exported for tests — must stay aligned with createCache getKey builder below. */
export const puzzleSlugMapCacheKeys = {
  slug_map: () => SLUG_MAP_KEY
} as const;

const live_slug_row_schema = z.object({
  kind: game_kind_schema,
  slug: z.string()
});

const redirect_row_schema = z.object({
  kind: game_kind_schema,
  slug: z.string(),
  target: z.string()
});

const slug_map_payload_schema = z.object({
  live: live_slug_row_schema.array(),
  redirects: redirect_row_schema.array()
});

type SlugMapPayload = z.infer<typeof slug_map_payload_schema>;

export type PuzzleSlugEntry = {
  liveSlugs: Set<string>;
  redirectTo: Map<string, string>;
};

export type PuzzleSlugMap = Record<GameKind, PuzzleSlugEntry>;

const emptySlugMap = (): PuzzleSlugMap =>
  // SAFETY: Object.fromEntries over the exhaustive GAME_KINDS tuple builds exactly one entry per game kind.
  Object.fromEntries(
    GAME_KINDS.map((kind) => [
      kind,
      { liveSlugs: new Set<string>(), redirectTo: new Map<string, string>() }
    ])
  ) as PuzzleSlugMap;

export const toSlugMap = (payload: SlugMapPayload): PuzzleSlugMap => {
  const map = emptySlugMap();
  for (const row of payload.live) {
    // Runtime guard: `game_kind` is a PG enum, but rows from a foreign/dumped
    // payload must not throw the transform for every slug route.
    if (!isGameKind(row.kind)) continue;
    map[row.kind].liveSlugs.add(row.slug);
  }
  for (const row of payload.redirects) {
    if (!isGameKind(row.kind)) continue;
    if (row.slug !== row.target) {
      map[row.kind].redirectTo.set(row.slug, row.target);
    }
  }
  return map;
};

const toCacheError = (operation: string) => (cause: unknown) =>
  CacheError.make({ operation, key: SLUG_MAP_KEY, cause });

const load_slug_map: CacheItem<NoCacheParams, PuzzleSlugMap> = createCache<
  NoCacheParams,
  SlugMapPayload,
  PuzzleSlugMap
>({
  getKey: () => SLUG_MAP_KEY,
  schema: slug_map_payload_schema,
  transform: toSlugMap,
  // Single key + many concurrent readers: converge cold misses onto one fetch,
  // and drop late writes from overlapping background refreshes.
  useSingleFlight: true,
  useGenerationGuard: true,
  fetch: () =>
    dbRunHttp('puzzle_slug_map.fetch', async (client) => {
      const [live, redirects] = await Promise.all([
        client.select({ kind: puzzles.kind, slug: puzzles.slug }).from(puzzles),
        client
          .select({
            kind: puzzle_redirects.kind,
            slug: puzzle_redirects.slug,
            target: puzzles.slug
          })
          .from(puzzle_redirects)
          .innerJoin(puzzles, eq(puzzle_redirects.puzzle_id, puzzles.id))
      ]);
      return { live, redirects };
    }).pipe(Effect.mapError(toCacheError('fetchSlugMap')))
});

export type PuzzleSlugMapCacheLoaders = {
  slug_map: CacheItem<NoCacheParams, PuzzleSlugMap>;
};

export const puzzle_slug_map_cache_loaders: PuzzleSlugMapCacheLoaders = {
  slug_map: load_slug_map
};

/**
 * Pure verdict for a public slug without touching the database.
 * Live slugs always win over redirect rules; anything else falls back to
 * the authoritative per-slug `word_puzzle` cache lookup.
 */
export function resolvePuzzleSlug(
  map: PuzzleSlugMap,
  kind: GameKind,
  slug: string
): { type: 'live' } | { type: 'redirect'; targetSlug: string } | { type: 'unknown' } {
  const entry = map[kind];
  if (entry.liveSlugs.has(slug)) return { type: 'live' };
  const targetSlug = entry.redirectTo.get(slug);
  if (!targetSlug) return { type: 'unknown' };
  // Stale-map hardening: a redirect whose target is not a known live slug
  // falls through to the authoritative word_puzzle lookup instead of 301→404.
  if (!entry.liveSlugs.has(targetSlug)) return { type: 'unknown' };
  return { type: 'redirect', targetSlug };
}

/** Invalidate + background-refresh the slug map after slug/redirect mutations. */
export const refreshPuzzleSlugMap = () =>
  invalidateAndRefreshCache(puzzle_slug_map_cache_loaders.slug_map, NO_CACHE_PARAMS);

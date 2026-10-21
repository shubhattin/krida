import { Effect } from 'effect';
import ms from 'ms';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { puzzles as puzzlesTable } from '~/db/schema';
import { createCache, type CacheItem, type NoCacheParams, NO_CACHE_PARAMS } from '~/effect/cache';
import { AppConfig } from '~/effect/config';
import { dbRunHttp } from '~/effect/database';
import { CacheError } from '~/effect/errors';

const SITEMAP_TTL_SECONDS = ms('4 days') / 1000;

const PADAVALI_SITEMAP_KEY = 'sitemap:padavali';
const PADAJALA_SITEMAP_KEY = 'sitemap:padajala';

const SIMPLE_SITEMAP_KINDS = ['dvayi', 'bhramita', 'surupa', 'anveshi'] as const;
type SimpleSitemapKind = (typeof SIMPLE_SITEMAP_KINDS)[number];

/** Exported for tests — must stay aligned with createCache getKey builders below. */
export const sitemapCacheKeys = {
  padavali: () => PADAVALI_SITEMAP_KEY,
  padajala: () => PADAJALA_SITEMAP_KEY,
  dvayi: () => 'sitemap:dvayi',
  bhramita: () => 'sitemap:bhramita',
  surupa: () => 'sitemap:surupa',
  anveshi: () => 'sitemap:anveshi'
} as const;

type SitemapUrlEntry = {
  loc: string;
  lastmod?: Date;
};

const toCacheError = (operation: string, key: string) => (cause: unknown) =>
  CacheError.make({ operation, key, cause });

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const formatLastmod = (date: Date): string => date.toISOString();

const buildUrlsetXml = (entries: SitemapUrlEntry[]): string => {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${formatLastmod(entry.lastmod)}</lastmod>` : '';
      return `<url><loc>${escapeXml(entry.loc)}</loc>${lastmod}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
};

const normalizeSiteUrl = (url: string): string => url.replace(/\/+$/, '');

const joinUrl = (base: string, pathname: string): string =>
  `${normalizeSiteUrl(base)}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;

/** Prefer updated_at, then last_listed_at, then created_at. */
const resolveLastmod = (puzzle: {
  updated_at: Date | null;
  last_listed_at: Date | null;
  created_at: Date;
}): Date => puzzle.updated_at ?? puzzle.last_listed_at ?? puzzle.created_at;

const load_padavali_sitemap: CacheItem<NoCacheParams, string> = createCache({
  getKey: () => PADAVALI_SITEMAP_KEY,
  schema: z.string(),
  ttlSeconds: SITEMAP_TTL_SECONDS,
  fetch: () =>
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const base = config.siteUrl;

      const [listedPuzzles, collections] = yield* Effect.all([
        dbRunHttp('sitemap.padavali_listed', (client) =>
          client
            .select({
              slug: puzzlesTable.slug,
              updated_at: puzzlesTable.updated_at,
              last_listed_at: puzzlesTable.last_listed_at,
              created_at: puzzlesTable.created_at
            })
            .from(puzzlesTable)
            .where(and(eq(puzzlesTable.kind, 'padavali'), eq(puzzlesTable.listed, true)))
        ),
        dbRunHttp('sitemap.listed_collections', (client) =>
          client.query.collections.findMany({
            columns: {
              slug: true,
              updated_at: true,
              created_at: true
            },
            where: ({ listed }, { eq }) => eq(listed, true)
          })
        )
      ]);

      const entries: SitemapUrlEntry[] = [
        { loc: joinUrl(base, '/') },
        { loc: joinUrl(base, '/puzzles') },
        { loc: joinUrl(base, '/puzzles?game=padavali') },
        ...collections.map((collection) => ({
          loc: joinUrl(base, `/collections/${encodeURIComponent(collection.slug)}`),
          lastmod: collection.updated_at ?? collection.created_at
        })),
        ...listedPuzzles.map((puzzle) => ({
          loc: joinUrl(base, `/padavali/${encodeURIComponent(puzzle.slug)}`),
          lastmod: resolveLastmod(puzzle)
        }))
      ];

      return buildUrlsetXml(entries);
    }).pipe(Effect.mapError(toCacheError('fetchPadavaliSitemap', PADAVALI_SITEMAP_KEY)))
});

const load_padajala_sitemap: CacheItem<NoCacheParams, string> = createCache({
  getKey: () => PADAJALA_SITEMAP_KEY,
  schema: z.string(),
  ttlSeconds: SITEMAP_TTL_SECONDS,
  fetch: () =>
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const base = config.siteUrl;

      const listedPuzzles = yield* dbRunHttp('sitemap.padajala_listed', (client) =>
        client
          .select({
            slug: puzzlesTable.slug,
            updated_at: puzzlesTable.updated_at,
            last_listed_at: puzzlesTable.last_listed_at,
            created_at: puzzlesTable.created_at
          })
          .from(puzzlesTable)
          .where(and(eq(puzzlesTable.kind, 'padajala'), eq(puzzlesTable.listed, true)))
      );

      const entries: SitemapUrlEntry[] = [
        { loc: joinUrl(base, '/puzzles?game=padajala') },
        ...listedPuzzles.map((puzzle) => ({
          loc: joinUrl(base, `/padajala/${encodeURIComponent(puzzle.slug)}`),
          lastmod: resolveLastmod(puzzle)
        }))
      ];

      return buildUrlsetXml(entries);
    }).pipe(Effect.mapError(toCacheError('fetchPadajalaSitemap', PADAJALA_SITEMAP_KEY)))
});

/** One sitemap per simple game: landing, puzzles filter, and every listed puzzle slug. */
function makeSimpleGameSitemap(kind: SimpleSitemapKind): CacheItem<NoCacheParams, string> {
  const key = `sitemap:${kind}`;
  return createCache({
    getKey: () => key,
    schema: z.string(),
    ttlSeconds: SITEMAP_TTL_SECONDS,
    fetch: () =>
      Effect.gen(function* () {
        const config = yield* AppConfig;
        const base = config.siteUrl;

        const listedPuzzles = yield* dbRunHttp(`sitemap.${kind}_listed`, (client) =>
          client
            .select({
              slug: puzzlesTable.slug,
              updated_at: puzzlesTable.updated_at,
              last_listed_at: puzzlesTable.last_listed_at,
              created_at: puzzlesTable.created_at
            })
            .from(puzzlesTable)
            .where(and(eq(puzzlesTable.kind, kind), eq(puzzlesTable.listed, true)))
        );

        const entries: SitemapUrlEntry[] = [
          { loc: joinUrl(base, `/${kind}`) },
          { loc: joinUrl(base, `/puzzles?game=${kind}`) },
          ...listedPuzzles.map((puzzle) => ({
            loc: joinUrl(base, `/${kind}/${encodeURIComponent(puzzle.slug)}`),
            lastmod: resolveLastmod(puzzle)
          }))
        ];

        return buildUrlsetXml(entries);
      }).pipe(Effect.mapError(toCacheError(`fetch${kind}Sitemap`, key)))
  });
}

export type SitemapCacheLoaders = {
  padavali: CacheItem<NoCacheParams, string>;
  padajala: CacheItem<NoCacheParams, string>;
  dvayi: CacheItem<NoCacheParams, string>;
  bhramita: CacheItem<NoCacheParams, string>;
  surupa: CacheItem<NoCacheParams, string>;
  anveshi: CacheItem<NoCacheParams, string>;
};

// SAFETY: entries are built from SIMPLE_SITEMAP_KINDS, covering every key exactly once.
const simple_sitemap_loaders = Object.fromEntries(
  SIMPLE_SITEMAP_KINDS.map((kind) => [kind, makeSimpleGameSitemap(kind)])
) as Record<SimpleSitemapKind, CacheItem<NoCacheParams, string>>;

export const sitemap_cache_loaders: SitemapCacheLoaders = {
  padavali: load_padavali_sitemap,
  padajala: load_padajala_sitemap,
  ...simple_sitemap_loaders
};

/** Drop cached XML only — next GET rebuilds. No background refresh. */
export const invalidate_padavali_sitemap = () => load_padavali_sitemap.delete(NO_CACHE_PARAMS);

export const invalidate_padajala_sitemap = () => load_padajala_sitemap.delete(NO_CACHE_PARAMS);

/** Drop one simple game's cached XML only — next GET rebuilds. */
export const invalidate_simple_game_sitemap = (kind: SimpleSitemapKind) =>
  simple_sitemap_loaders[kind].delete(NO_CACHE_PARAMS);

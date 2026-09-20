import { Effect } from 'effect';
import ms from 'ms';
import { z } from 'zod';
import { createCache, type CacheItem, type NoCacheParams, NO_CACHE_PARAMS } from '~/effect/cache';
import { AppConfig } from '~/effect/config';
import { dbRunHttp } from '~/effect/database';
import { CacheError } from '~/effect/errors';

const SITEMAP_TTL_SECONDS = ms('4 days') / 1000;

const PADAVALI_SITEMAP_KEY = 'sitemap:padavali';
const PADAJALA_SITEMAP_KEY = 'sitemap:padajala';

/** Exported for tests — must stay aligned with createCache getKey builders below. */
export const sitemapCacheKeys = {
  padavali: () => PADAVALI_SITEMAP_KEY,
  padajala: () => PADAJALA_SITEMAP_KEY
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

      const puzzles = yield* dbRunHttp('sitemap.padavali_listed', (client) =>
        client.query.padavali_puzzles.findMany({
          columns: {
            slug: true,
            updated_at: true,
            last_listed_at: true,
            created_at: true
          },
          where: ({ listed }, { eq }) => eq(listed, true)
        })
      );

      const entries: SitemapUrlEntry[] = [
        { loc: joinUrl(base, '/padavali') },
        { loc: joinUrl(base, '/padavali/puzzles') },
        ...puzzles.map((puzzle) => ({
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

      const puzzles = yield* dbRunHttp('sitemap.padajala_listed', (client) =>
        client.query.crossword_puzzles.findMany({
          columns: {
            slug: true,
            updated_at: true,
            last_listed_at: true,
            created_at: true
          },
          where: ({ listed }, { eq }) => eq(listed, true)
        })
      );

      const entries: SitemapUrlEntry[] = [
        { loc: joinUrl(base, '/padajala') },
        { loc: joinUrl(base, '/padajala/puzzles') },
        ...puzzles.map((puzzle) => ({
          loc: joinUrl(base, `/padajala/${encodeURIComponent(puzzle.slug)}`),
          lastmod: resolveLastmod(puzzle)
        }))
      ];

      return buildUrlsetXml(entries);
    }).pipe(Effect.mapError(toCacheError('fetchPadajalaSitemap', PADAJALA_SITEMAP_KEY)))
});

export type SitemapCacheLoaders = {
  padavali: CacheItem<NoCacheParams, string>;
  padajala: CacheItem<NoCacheParams, string>;
};

export const sitemap_cache_loaders: SitemapCacheLoaders = {
  padavali: load_padavali_sitemap,
  padajala: load_padajala_sitemap
};

/** Drop cached XML only — next GET rebuilds. No background refresh. */
export const invalidate_padavali_sitemap = () => load_padavali_sitemap.delete(NO_CACHE_PARAMS);

export const invalidate_padajala_sitemap = () => load_padajala_sitemap.delete(NO_CACHE_PARAMS);

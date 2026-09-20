import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';

export type SeoStaticFilesOptions = {
  /** Public site origin, e.g. https://example.com (no trailing slash preferred). */
  siteUrl?: string;
};

const normalizeSiteUrl = (url: string): string => url.replace(/\/+$/, '');

const ROBOTS_DISALLOW = [
  '/api/',
  '/dashboard',
  '/padavali/list',
  '/padavali/edit',
  '/padavali/schedules',
  '/padavali/analytics',
  '/padavali/batch_manager',
  '/padavali/view/',
  '/padajala/list',
  '/padajala/edit',
  '/padajala/schedules',
  '/padajala/analytics',
  '/padajala/batch_manager',
  '/padajala/view/'
] as const;

const buildRobotsTxt = (siteUrl: string): string =>
  [
    `User-agent: *`,
    `Allow: /`,
    ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`),
    ``,
    `Sitemap: ${siteUrl}/sitemap-index.xml`,
    ``
  ].join('\n');

const buildSitemapIndex = (siteUrl: string): string =>
  [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    `  <sitemap><loc>${siteUrl}/sitemap-0.xml</loc></sitemap>`,
    `  <sitemap><loc>${siteUrl}/sitemap-1.xml</loc></sitemap>`,
    `</sitemapindex>`,
    ``
  ].join('\n');

const writeSeoFiles = async (outDir: string, robotsTxt: string, sitemapIndex: string) => {
  await fs.mkdir(outDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outDir, 'robots.txt'), robotsTxt, 'utf8'),
    fs.writeFile(path.join(outDir, 'sitemap-index.xml'), sitemapIndex, 'utf8')
  ]);
};

/**
 * Injects static `robots.txt` and `sitemap-index.xml` into the build output
 * (and serves them in Vite dev). Dynamic sitemap bodies are served by routes.
 */
export function seoStaticFilesPlugin(options: SeoStaticFilesOptions = {}): Plugin {
  const siteUrl = normalizeSiteUrl(
    options.siteUrl ?? process.env.VITE_SITE_URL ?? 'http://localhost:3000'
  );
  const robotsTxt = buildRobotsTxt(siteUrl);
  const sitemapIndex = buildSitemapIndex(siteUrl);

  return {
    name: 'seo-static-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (pathname === '/robots.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(robotsTxt);
          return;
        }
        if (pathname === '/sitemap-index.xml') {
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.end(sitemapIndex);
          return;
        }
        next();
      });
    },
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        const outDir = path.resolve(process.cwd(), '.output/public');
        await writeSeoFiles(outDir, robotsTxt, sitemapIndex);
      }
    }
  };
}

import { createFileRoute } from '@tanstack/react-router';

const siteUrl = import.meta.env.VITE_SITE_URL.replace(/\/+$/, '');

const SITEMAP_INDEX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${siteUrl}/sitemap-0.xml</loc></sitemap>
  <sitemap><loc>${siteUrl}/sitemap-1.xml</loc></sitemap>
  <sitemap><loc>${siteUrl}/sitemap-2.xml</loc></sitemap>
  <sitemap><loc>${siteUrl}/sitemap-3.xml</loc></sitemap>
  <sitemap><loc>${siteUrl}/sitemap-4.xml</loc></sitemap>
  <sitemap><loc>${siteUrl}/sitemap-5.xml</loc></sitemap>
</sitemapindex>
`;

export const Route = createFileRoute('/sitemap-index.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(SITEMAP_INDEX_XML, {
          headers: { 'Content-Type': 'application/xml; charset=utf-8' }
        })
    }
  }
});

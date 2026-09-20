import { createFileRoute } from '@tanstack/react-router';

const siteUrl = import.meta.env.VITE_SITE_URL.replace(/\/+$/, '');

const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /padavali/list
Disallow: /padavali/edit
Disallow: /padavali/schedules
Disallow: /padavali/analytics
Disallow: /padavali/batch_manager
Disallow: /padavali/view/
Disallow: /padajala/list
Disallow: /padajala/edit
Disallow: /padajala/schedules
Disallow: /padajala/analytics
Disallow: /padajala/batch_manager
Disallow: /padajala/view/

Sitemap: ${siteUrl}/sitemap-index.xml
`;

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(ROBOTS_TXT, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
    }
  }
});

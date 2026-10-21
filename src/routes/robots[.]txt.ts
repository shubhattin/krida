import { createFileRoute } from '@tanstack/react-router';

const siteUrl = import.meta.env.VITE_SITE_URL.replace(/\/+$/, '');

const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /admin
Disallow: /analytics
Disallow: /collections/list
Disallow: /collections/edit
Disallow: /tags/list
Disallow: /tags/edit
Disallow: /padavali/list
Disallow: /padavali/edit
Disallow: /schedules
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
Disallow: /dvayi/list
Disallow: /dvayi/edit
Disallow: /dvayi/analytics
Disallow: /dvayi/view/
Disallow: /bhramita/list
Disallow: /bhramita/edit
Disallow: /bhramita/analytics
Disallow: /bhramita/view/
Disallow: /surupa/list
Disallow: /surupa/edit
Disallow: /surupa/analytics
Disallow: /surupa/view/
Disallow: /anveshi/list
Disallow: /anveshi/edit
Disallow: /anveshi/analytics
Disallow: /anveshi/view/

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

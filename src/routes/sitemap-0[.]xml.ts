import { createFileRoute } from '@tanstack/react-router';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { runRouteEffect } from '~/effect/run';

export const Route = createFileRoute('/sitemap-0.xml')({
  server: {
    handlers: {
      GET: () =>
        runRouteEffect(CACHE.sitemap.padavali.get(NO_CACHE_PARAMS), {
          onSuccess: (xml) =>
            new Response(xml, {
              headers: {
                'Content-Type': 'application/xml; charset=utf-8'
              }
            })
        })
    }
  }
});

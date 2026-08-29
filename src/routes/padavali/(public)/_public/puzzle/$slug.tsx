import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/padavali/puzzle/:slug` → `/padavali/:slug`. */
export const Route = createFileRoute('/padavali/(public)/_public/puzzle/$slug')({
  beforeLoad: ({ params }) => {
    throw redirect({
      href: `/padavali/${encodeURIComponent(params.slug)}`,
      statusCode: 301
    });
  }
});

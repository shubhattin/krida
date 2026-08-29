import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/padajala/puzzle/:slug` → `/padajala/:slug`. */
export const Route = createFileRoute('/padajala/(public)/_public/puzzle/$slug')({
  beforeLoad: ({ params }) => {
    throw redirect({
      href: `/padajala/${encodeURIComponent(params.slug)}`,
      statusCode: 301
    });
  }
});

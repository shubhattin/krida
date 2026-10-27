import { createFileRoute, redirect } from '@tanstack/react-router';
import { fromQuery, puzzle_page_search_schema } from '~/util/catalog/collection_nav';

/** Legacy `/padajala/puzzle/:slug` → `/padajala/:slug`. */
export const Route = createFileRoute('/padajala/(public)/_public/puzzle/$slug')({
  validateSearch: puzzle_page_search_schema,
  beforeLoad: ({ params, search }) => {
    throw redirect({
      href: `/padajala/${encodeURIComponent(params.slug)}${fromQuery(search.from)}`,
      statusCode: 301
    });
  }
});

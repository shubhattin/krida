import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { z } from 'zod';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import HubExplore from '~/components/hub/HubExplore';

const hubRoute = getRouteApi('/_hub');

const explore_search_schema = z.object({
  game: z.enum(['all', 'padavali', 'crossword']).catch('all').default('all'),
  view: z.enum(['puzzles', 'collections']).catch('puzzles').default('puzzles'),
  tag: z.string().max(80).optional().catch(undefined),
  q: z.string().max(200).optional().catch(undefined),
  /** 1-based; omitted from the URL when on page 1. */
  page: z.coerce.number().int().min(1).optional().catch(undefined)
});

export type ExploreSearch = z.infer<typeof explore_search_schema>;

export const Route = createFileRoute('/_hub/explore')({
  validateSearch: explore_search_schema,
  head: () =>
    routeHeadFromPageMeta({
      title: 'Explore Sanskrit Puzzles | Krida',
      project: 'landing_page',
      description:
        'Browse every Sanskrit word-search and crossword puzzle, curated collections, and topics in one place.'
    }),
  component: ExplorePage
});

function ExplorePage() {
  const data = hubRoute.useLoaderData();
  return <HubExplore data={data} />;
}

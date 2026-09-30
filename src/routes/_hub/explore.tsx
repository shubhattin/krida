import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import HubExplore from '~/components/hub/HubExplore';
import { librarySearchSchema } from '~/components/hub/library_search';

const hubRoute = getRouteApi('/_hub');

export const Route = createFileRoute('/_hub/explore')({
  validateSearch: librarySearchSchema,
  head: () =>
    routeHeadFromPageMeta({
      title: 'Explore Sanskrit Puzzles | Sanskrit Games',
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

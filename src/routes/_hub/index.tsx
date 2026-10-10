import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { z } from 'zod';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import HubHome from '~/components/hub/HubHome';

const hubRoute = getRouteApi('/_hub');

/** Home deep-link / SSR filter for the puzzles section (`/?game=padavali#padavali`). */
const home_search_schema = z.object({
  game: z.enum(['padavali', 'crossword']).optional().catch(undefined)
});

export type HomeSearch = z.infer<typeof home_search_schema>;

export const Route = createFileRoute('/_hub/')({
  validateSearch: home_search_schema,
  head: () =>
    routeHeadFromPageMeta({
      title: 'Krida | Play, Learn, Grow',
      project: 'landing_page',
      description:
        'Sanskrit Games — play word-search and crossword puzzles, learn across Indian scripts, and grow your vocabulary through fun challenges. Padavali and Padajala help you learn Sanskrit through games.'
    }),
  component: Home
});

function Home() {
  const data = hubRoute.useLoaderData();
  return <HubHome data={data} />;
}

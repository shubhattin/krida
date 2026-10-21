import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { z } from 'zod';
import { routeHeadFromPageMeta, siteUrl } from '~/components/tags/getPageMetaTags';
import HubHome from '~/components/hub/HubHome';

const hubRoute = getRouteApi('/_hub');

/** Home deep-link / SSR filter for the puzzles section (`/?game=dvayi#dvayi`). */
const home_search_schema = z.object({
  game: z
    .enum(['padavali', 'padajala', 'dvayi', 'bhramita', 'surupa', 'anveshi'])
    .optional()
    .catch(undefined)
});

export type HomeSearch = z.infer<typeof home_search_schema>;

export const Route = createFileRoute('/_hub/')({
  validateSearch: home_search_schema,
  head: () =>
    routeHeadFromPageMeta({
      title: 'Krida | Play, Learn, Grow',
      project: 'landing_page',
      description:
        'Sanskrit Games — play Padāvalī word search, Padajāla grids, Dvayī matching, Bhramitā jumbles, Surūpa spelling and Ānveṣī quizzes across Indian scripts, and grow your vocabulary through fun challenges.',
      canonical: `${siteUrl()}/`
    }),
  component: Home
});

function Home() {
  const data = hubRoute.useLoaderData();
  return <HubHome data={data} />;
}

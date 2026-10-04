import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import HubHome from '~/components/hub/HubHome';

const hubRoute = getRouteApi('/_hub');

export const Route = createFileRoute('/_hub/')({
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

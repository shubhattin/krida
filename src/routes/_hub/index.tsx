import { createFileRoute } from '@tanstack/react-router';
import { useHubData } from '~/components/hub/hub_query';
import { z } from 'zod';
import { routeHeadFromPageMeta, siteUrl } from '~/components/tags/getPageMetaTags';
import HubHome from '~/components/hub/HubHome';
import { GAME_KINDS } from '~/util/catalog/tags';

/** Home deep-link / SSR filter for the puzzles section (`/?game=dvayi#dvayi`). */
const home_search_schema = z.object({
  game: z.enum(GAME_KINDS).optional().catch(undefined)
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
  const data = useHubData();
  return <HubHome data={data} />;
}

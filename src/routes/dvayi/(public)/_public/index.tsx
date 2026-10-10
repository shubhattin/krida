import { createFileRoute } from '@tanstack/react-router';
import { SimpleGameLanding } from '~/components/pages/simple_game/SimpleGameLanding';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameListed$ } from '~/lib/simple_game_loaders';

export const Route = createFileRoute('/dvayi/(public)/_public/')({
  loader: () => loadSimpleGameListed$({ data: { kind: 'dvayi' } }),
  head: () =>
    routeHeadFromPageMeta({
      title: 'Dvayī',
      project: 'dvayi',
      robots: 'noindex'
    }),
  component: LandingRoute
});

function LandingRoute() {
  const { list } = Route.useLoaderData();
  return <SimpleGameLanding kind="dvayi" puzzles={list} />;
}

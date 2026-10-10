import { createFileRoute } from '@tanstack/react-router';
import { SimpleGameLanding } from '~/components/pages/simple_game/SimpleGameLanding';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameListed$ } from '~/lib/simple_game_loaders';

export const Route = createFileRoute('/bhramita/(public)/_public/')({
  loader: () => loadSimpleGameListed$({ data: { kind: 'bhramita' } }),
  head: () =>
    routeHeadFromPageMeta({
      title: 'Bhramitā',
      project: 'bhramita',
      robots: 'noindex'
    }),
  component: LandingRoute
});

function LandingRoute() {
  const { list } = Route.useLoaderData();
  return <SimpleGameLanding kind="bhramita" puzzles={list} />;
}

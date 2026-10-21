import { createFileRoute } from '@tanstack/react-router';
import { SimpleGameLanding } from '~/components/pages/simple_game/SimpleGameLanding';
import { routeHeadFromPageMeta, siteUrl } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameListed$ } from '~/lib/simple_game_loaders';
import { SIMPLE_GAME_META } from '~/util/games/kinds';

const meta = SIMPLE_GAME_META.bhramita;

export const Route = createFileRoute('/bhramita/(public)/_public/')({
  loader: () => loadSimpleGameListed$({ data: { kind: 'bhramita' } }),
  head: () =>
    routeHeadFromPageMeta({
      title: `${meta.name} | Krida`,
      description: meta.description,
      project: 'bhramita',
      canonical: `${siteUrl()}/bhramita`
    }),
  component: LandingRoute
});

function LandingRoute() {
  const { list } = Route.useLoaderData();
  return <SimpleGameLanding kind="bhramita" puzzles={list} />;
}

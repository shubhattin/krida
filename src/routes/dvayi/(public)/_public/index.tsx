import { createFileRoute } from '@tanstack/react-router';
import { SimpleGameLanding } from '~/components/pages/simple_game/SimpleGameLanding';
import { routeHeadFromPageMeta, siteUrl } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameListed$ } from '~/lib/simple_game_loaders';
import { SIMPLE_GAME_META } from '~/util/games/kinds';

const meta = SIMPLE_GAME_META.dvayi;

export const Route = createFileRoute('/dvayi/(public)/_public/')({
  loader: () => loadSimpleGameListed$({ data: { kind: 'dvayi' } }),
  head: () =>
    routeHeadFromPageMeta({
      title: `${meta.name} | Krida`,
      description: meta.description,
      project: 'dvayi',
      canonical: `${siteUrl()}/dvayi`
    }),
  component: LandingRoute
});

function LandingRoute() {
  const { list } = Route.useLoaderData();
  return <SimpleGameLanding kind="dvayi" puzzles={list} />;
}

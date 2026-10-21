import { createFileRoute } from '@tanstack/react-router';
import { SimpleGameLanding } from '~/components/pages/simple_game/SimpleGameLanding';
import { routeHeadFromPageMeta, siteUrl } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameListed$ } from '~/lib/simple_game_loaders';
import { SIMPLE_GAME_META } from '~/util/games/kinds';

const meta = SIMPLE_GAME_META.surupa;

export const Route = createFileRoute('/surupa/(public)/_public/')({
  loader: () => loadSimpleGameListed$({ data: { kind: 'surupa' } }),
  head: () =>
    routeHeadFromPageMeta({
      title: `${meta.name} | Krida`,
      description: meta.description,
      project: 'surupa',
      canonical: `${siteUrl()}/surupa`
    }),
  component: LandingRoute
});

function LandingRoute() {
  const { list } = Route.useLoaderData();
  return <SimpleGameLanding kind="surupa" puzzles={list} />;
}

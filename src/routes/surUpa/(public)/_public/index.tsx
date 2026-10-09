import { createFileRoute } from '@tanstack/react-router';
import { SimpleGameLanding } from '~/components/pages/simple_game/SimpleGameLanding';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameListed$ } from '~/lib/simple_game_loaders';

export const Route = createFileRoute('/surUpa/(public)/_public/')({
  loader: () => loadSimpleGameListed$({ data: { kind: 'surupa' } }),
  head: () =>
    routeHeadFromPageMeta({
      title: 'Surūpa',
      project: 'surupa',
      robots: 'noindex'
    }),
  component: LandingRoute
});

function LandingRoute() {
  const { list } = Route.useLoaderData();
  return <SimpleGameLanding kind="surupa" puzzles={list} />;
}

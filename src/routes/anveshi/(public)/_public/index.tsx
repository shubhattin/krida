import { createFileRoute } from '@tanstack/react-router';
import { SimpleGameLanding } from '~/components/pages/simple_game/SimpleGameLanding';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameListed$ } from '~/lib/simple_game_loaders';

export const Route = createFileRoute('/anveshi/(public)/_public/')({
  loader: () => loadSimpleGameListed$({ data: { kind: 'anveshi' } }),
  head: () =>
    routeHeadFromPageMeta({
      title: 'Anveṣī',
      project: 'anveshi',
      robots: 'noindex'
    }),
  component: LandingRoute
});

function LandingRoute() {
  const { list } = Route.useLoaderData();
  return <SimpleGameLanding kind="anveshi" puzzles={list} />;
}

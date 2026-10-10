import { createFileRoute, notFound } from '@tanstack/react-router';
import { SimpleGamePlayPage } from '~/components/pages/simple_game/SimpleGamePlayPage';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameByUid$ } from '~/lib/simple_game_loaders';

export const Route = createFileRoute('/surupa/(public)/_public/view/$nano_id')({
  loader: async ({ params }) => {
    const { puzzle } = await loadSimpleGameByUid$({
      data: { kind: 'surupa', nano_id: params.nano_id }
    });
    if (!puzzle) throw notFound();
    return { puzzle };
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.puzzle.title} | Surūpa` : 'Not Found',
      description: loaderData ? loaderData.puzzle.description : null,
      project: 'surupa',
      robots: 'noindex'
    }),
  component: ViewRoute
});

function ViewRoute() {
  const { puzzle } = Route.useLoaderData();
  return <SimpleGamePlayPage kind="surupa" location="view_page" puzzle={puzzle} preview />;
}

import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { SimpleGamePlayPage } from '~/components/pages/simple_game/SimpleGamePlayPage';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameBySlug$ } from '~/lib/simple_game_loaders';
import { SIMPLE_GAME_META } from '~/util/games/kinds';

const meta = SIMPLE_GAME_META.bhramita;

export const Route = createFileRoute('/bhramitA/(public)/_public/$slug')({
  loader: async ({ params }) => {
    const result = await loadSimpleGameBySlug$({ data: { kind: 'bhramita', slug: params.slug } });
    if (result.kind === 'redirect') {
      throw redirect({
        href: `/${meta.routePrefix}/${encodeURIComponent(result.targetSlug)}`,
        statusCode: 301
      });
    }
    if (result.kind === 'not_found') throw notFound();
    return result;
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData
        ? `${loaderData.kind === 'puzzle' ? loaderData.puzzle.title : loaderData.title} | Bhramitā`
        : 'Not Found',
      description: loaderData
        ? loaderData.kind === 'puzzle'
          ? loaderData.puzzle.description
          : loaderData.description
        : null,
      project: 'bhramita',
      robots: 'noindex'
    }),
  component: SlugRoute
});

function SlugRoute() {
  const data = Route.useLoaderData();
  if (data.kind === 'unavailable') {
    return (
      <div className="px-4 py-16 text-center text-muted-foreground">
        This puzzle is not available.
      </div>
    );
  }
  return <SimpleGamePlayPage kind="bhramita" location="list_page" puzzle={data.puzzle} />;
}

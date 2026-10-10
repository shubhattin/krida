import { createFileRoute, notFound } from '@tanstack/react-router';
import { Provider as JotaiProvider } from 'jotai';
import { AnveshiViewEdit } from '~/components/pages/anveshi/AnveshiViewEdit';
import { SimpleGameEditHeader } from '~/components/pages/simple_game/SimpleGameAdminPages';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameEdit$ } from '~/lib/simple_game_loaders';
import { anveshi_puzzle_data_schema } from '~/util/anveshi/data';

export const Route = createFileRoute('/anveshi/(auth)/_auth/edit/$id')({
  loader: async ({ params }) => {
    const { puzzle, catalog } = await loadSimpleGameEdit$({
      data: { kind: 'anveshi', rawId: params.id }
    });
    if (!puzzle) throw notFound();
    return {
      puzzle: { ...puzzle, puzzle_data: anveshi_puzzle_data_schema.parse(puzzle.puzzle_data) },
      catalog
    };
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.puzzle.title} - Edit` : 'Not Found',
      project: 'anveshi',
      robots: 'noindex'
    }),
  component: EditRoute
});

function EditRoute() {
  const { puzzle, catalog } = Route.useLoaderData();
  return (
    <>
      <SimpleGameEditHeader kind="anveshi" uid={puzzle.uid} />
      <JotaiProvider key={`anveshi_edit_${puzzle.id}`}>
        <AnveshiViewEdit puzzle={puzzle} catalog={catalog} />
      </JotaiProvider>
    </>
  );
}

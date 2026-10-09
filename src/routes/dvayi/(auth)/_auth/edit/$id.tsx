import { createFileRoute, notFound } from '@tanstack/react-router';
import { Provider as JotaiProvider } from 'jotai';
import { DvayiViewEdit } from '~/components/pages/dvayi/DvayiViewEdit';
import { SimpleGameEditHeader } from '~/components/pages/simple_game/SimpleGameAdminPages';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameEdit$ } from '~/lib/simple_game_loaders';
import { dvayi_puzzle_data_schema } from '~/util/dvayi/data';

export const Route = createFileRoute('/dvayi/(auth)/_auth/edit/$id')({
  loader: async ({ params }) => {
    const { puzzle, catalog } = await loadSimpleGameEdit$({
      data: { kind: 'dvayi', rawId: params.id }
    });
    if (!puzzle) throw notFound();
    return {
      puzzle: { ...puzzle, puzzle_data: dvayi_puzzle_data_schema.parse(puzzle.puzzle_data) },
      catalog
    };
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.puzzle.title} - Edit` : 'Not Found',
      project: 'dvayi',
      robots: 'noindex'
    }),
  component: EditRoute
});

function EditRoute() {
  const { puzzle, catalog } = Route.useLoaderData();
  return (
    <>
      <SimpleGameEditHeader kind="dvayi" uid={puzzle.uid} />
      <JotaiProvider key={`dvayi_edit_${puzzle.id}`}>
        <DvayiViewEdit puzzle={puzzle} catalog={catalog} />
      </JotaiProvider>
    </>
  );
}

import { createFileRoute, notFound } from '@tanstack/react-router';
import { Provider as JotaiProvider } from 'jotai';
import { BhramitaViewEdit } from '~/components/pages/bhramita/BhramitaViewEdit';
import { SimpleGameEditHeader } from '~/components/pages/simple_game/SimpleGameAdminPages';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameEdit$ } from '~/lib/simple_game_loaders';
import { bhramita_puzzle_data_schema } from '~/util/bhramita/data';

export const Route = createFileRoute('/bhramitA/(auth)/_auth/edit/$id')({
  loader: async ({ params }) => {
    const { puzzle, catalog } = await loadSimpleGameEdit$({
      data: { kind: 'bhramita', rawId: params.id }
    });
    if (!puzzle) throw notFound();
    return {
      puzzle: { ...puzzle, puzzle_data: bhramita_puzzle_data_schema.parse(puzzle.puzzle_data) },
      catalog
    };
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.puzzle.title} - Edit` : 'Not Found',
      project: 'bhramita',
      robots: 'noindex'
    }),
  component: EditRoute
});

function EditRoute() {
  const { puzzle, catalog } = Route.useLoaderData();
  return (
    <>
      <SimpleGameEditHeader kind="bhramita" uid={puzzle.uid} />
      <JotaiProvider key={`bhramita_edit_${puzzle.id}`}>
        <BhramitaViewEdit puzzle={puzzle} catalog={catalog} />
      </JotaiProvider>
    </>
  );
}

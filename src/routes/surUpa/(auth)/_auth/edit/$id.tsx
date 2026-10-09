import { createFileRoute, notFound } from '@tanstack/react-router';
import { Provider as JotaiProvider } from 'jotai';
import { SurupaViewEdit } from '~/components/pages/surupa/SurupaViewEdit';
import { SimpleGameEditHeader } from '~/components/pages/simple_game/SimpleGameAdminPages';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { loadSimpleGameEdit$ } from '~/lib/simple_game_loaders';
import { surupa_puzzle_data_schema } from '~/util/surupa/data';

export const Route = createFileRoute('/surUpa/(auth)/_auth/edit/$id')({
  loader: async ({ params }) => {
    const { puzzle, catalog } = await loadSimpleGameEdit$({
      data: { kind: 'surupa', rawId: params.id }
    });
    if (!puzzle) throw notFound();
    return {
      puzzle: { ...puzzle, puzzle_data: surupa_puzzle_data_schema.parse(puzzle.puzzle_data) },
      catalog
    };
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.puzzle.title} - Edit` : 'Not Found',
      project: 'surupa',
      robots: 'noindex'
    }),
  component: EditRoute
});

function EditRoute() {
  const { puzzle, catalog } = Route.useLoaderData();
  return (
    <>
      <SimpleGameEditHeader kind="surupa" uid={puzzle.uid} />
      <JotaiProvider key={`surupa_edit_${puzzle.id}`}>
        <SurupaViewEdit puzzle={puzzle} catalog={catalog} />
      </JotaiProvider>
    </>
  );
}

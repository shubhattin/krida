import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { SimpleGamePlayPage } from '~/components/pages/simple_game/SimpleGamePlayPage';
import {
  routeHeadFromPageMeta,
  shareImageInfoFromAsset,
  siteUrl
} from '~/components/tags/getPageMetaTags';
import { loadSimpleGameBySlug$ } from '~/lib/simple_game_loaders';
import { SIMPLE_GAME_META, simpleGameHref } from '~/util/games/kinds';
import { loadPuzzleCollectionContext$ } from '~/lib/puzzle_collection_context';
import { PuzzleCollectionProvider } from '~/components/pages/puzzle/puzzle_collection_context';
import {
  EMPTY_PUZZLE_COLLECTION_CONTEXT,
  fromQuery,
  puzzle_page_search_schema
} from '~/util/catalog/collection_nav';

const meta = SIMPLE_GAME_META.anveshi;

export const Route = createFileRoute('/anveshi/(public)/_public/$slug')({
  validateSearch: puzzle_page_search_schema,
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ params, deps }) => {
    const result = await loadSimpleGameBySlug$({ data: { kind: 'anveshi', slug: params.slug } });
    const from = deps.from;
    if (result.kind === 'redirect') {
      throw redirect({
        href: `${simpleGameHref(meta.kind, result.targetSlug)}${fromQuery(from)}`,
        statusCode: 301
      });
    }
    if (result.kind === 'not_found') throw notFound();
    const collection =
      result.kind === 'puzzle'
        ? await loadPuzzleCollectionContext$({
            data: { game: 'anveshi', slug: result.puzzle.slug, from }
          }).catch(() => EMPTY_PUZZLE_COLLECTION_CONTEXT)
        : EMPTY_PUZZLE_COLLECTION_CONTEXT;
    return { ...result, collection };
  },
  head: ({ loaderData }) => {
    const isPuzzle = loaderData?.kind === 'puzzle';
    return routeHeadFromPageMeta({
      title: loaderData
        ? `${loaderData.kind === 'puzzle' ? loaderData.puzzle.title : loaderData.title} | Anveṣī`
        : 'Not Found',
      description: loaderData
        ? loaderData.kind === 'puzzle'
          ? loaderData.puzzle.description
          : loaderData.description
        : null,
      project: 'anveshi',
      ...(isPuzzle
        ? { canonical: `${siteUrl()}/anveshi/${encodeURIComponent(loaderData.puzzle.slug)}` }
        : { robots: 'noindex' }),
      share_image_info: shareImageInfoFromAsset(
        loaderData?.kind === 'puzzle' ? loaderData.puzzle.image : null
      )
    });
  },
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
  return (
    <PuzzleCollectionProvider value={data.collection}>
      <SimpleGamePlayPage kind="anveshi" location="list_page" puzzle={data.puzzle} />
    </PuzzleCollectionProvider>
  );
}

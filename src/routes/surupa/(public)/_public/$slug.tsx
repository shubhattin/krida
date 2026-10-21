import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { SimpleGamePlayPage } from '~/components/pages/simple_game/SimpleGamePlayPage';
import {
  routeHeadFromPageMeta,
  shareImageInfoFromAsset,
  siteUrl
} from '~/components/tags/getPageMetaTags';
import { loadSimpleGameBySlug$ } from '~/lib/simple_game_loaders';
import { SIMPLE_GAME_META, simpleGameHref } from '~/util/games/kinds';

const meta = SIMPLE_GAME_META.surupa;

export const Route = createFileRoute('/surupa/(public)/_public/$slug')({
  loader: async ({ params }) => {
    const result = await loadSimpleGameBySlug$({ data: { kind: 'surupa', slug: params.slug } });
    if (result.kind === 'redirect') {
      throw redirect({
        href: simpleGameHref(meta.kind, result.targetSlug),
        statusCode: 301
      });
    }
    if (result.kind === 'not_found') throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    const isPuzzle = loaderData?.kind === 'puzzle';
    return routeHeadFromPageMeta({
      title: loaderData
        ? `${loaderData.kind === 'puzzle' ? loaderData.puzzle.title : loaderData.title} | Surūpa`
        : 'Not Found',
      description: loaderData
        ? loaderData.kind === 'puzzle'
          ? loaderData.puzzle.description
          : loaderData.description
        : null,
      project: 'surupa',
      ...(isPuzzle
        ? { canonical: `${siteUrl()}/surupa/${encodeURIComponent(loaderData.puzzle.slug)}` }
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
  return <SimpleGamePlayPage kind="surupa" location="list_page" puzzle={data.puzzle} />;
}

import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { transliterate_node } from 'lipilekhika/node';
import { z } from 'zod';
import WordGame from '~/components/pages/padavali/WordGame/WordGameRoot';
import { get_transliterated_word_game_msgs } from '~/components/pages/padavali/WordGame/msgs';
import { transliterate_custom } from '~/tools/transliterator';
import { routeHeadFromPageMeta, shareImageInfoFromAsset } from '~/components/tags/getPageMetaTags';
import { getScript$ } from '~/lib/cache_server_route_data';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import type { PadavaliPuzzleType } from '~/util/cache.server/padavali_cache';
import { resolvePuzzleSlug } from '~/util/cache.server/puzzle_slug_map_cache';
import { runLoaderEffect } from '~/effect/run';

type SlugResolution =
  | { type: 'puzzle'; puzzle: PadavaliPuzzleType }
  | { type: 'redirect'; targetSlug: string }
  | { type: 'not_found' };

const resolve_puzzle_slug = async (slug: string): Promise<SlugResolution> => {
  // Degraded but serving: if the slug map is unavailable, fall back to the
  // authoritative word_puzzle lookup with no redirect fast-path.
  const slug_map = await runLoaderEffect(CACHE.slug_map.slug_map.get(NO_CACHE_PARAMS)).catch(
    () => null
  );
  const verdict = slug_map ? resolvePuzzleSlug(slug_map, 'padavali', slug) : null;
  if (verdict?.type === 'redirect') {
    return { type: 'redirect', targetSlug: verdict.targetSlug };
  }

  const word_puzzle = await runLoaderEffect(CACHE.padavali.word_puzzle.get({ slug }));
  if (word_puzzle) {
    return { type: 'puzzle', puzzle: word_puzzle };
  }

  return { type: 'not_found' };
};

const loader$ = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const resolution = await resolve_puzzle_slug(data.slug);

    if (resolution.type === 'redirect') {
      return { kind: 'redirect' as const, targetSlug: resolution.targetSlug };
    }
    if (resolution.type === 'not_found') {
      return { kind: 'not_found' as const };
    }

    const word_puzzle = resolution.puzzle;

    const [current_schedule, next_schedule] = await Promise.all([
      runLoaderEffect(CACHE.padavali.current_schedule.get(NO_CACHE_PARAMS)),
      runLoaderEffect(CACHE.padavali.next_schedule.get(NO_CACHE_PARAMS))
    ]);

    if (current_schedule && word_puzzle.id === current_schedule.puzzle.id) {
      return { kind: 'current_puzzle' as const };
    }

    if (!word_puzzle.listed) {
      return {
        kind: 'unavailable' as const,
        title: word_puzzle.title,
        description: word_puzzle.description,
        image: word_puzzle.image
      };
    }

    const script = await getScript$();
    const word_game_msgs = await get_transliterated_word_game_msgs(script, transliterate_node);
    const title = await transliterate_custom(
      word_puzzle.title,
      DEFAULT_DATA_SCRIPT,
      script,
      undefined,
      transliterate_node
    );
    const grid_cells = await transliterate_custom(
      word_puzzle.grid_data.flat(),
      DEFAULT_DATA_SCRIPT,
      script,
      undefined,
      transliterate_node
    );
    let cell_i = 0;
    const grid_data = word_puzzle.grid_data.map((row) => row.map(() => grid_cells[cell_i++]!));

    return {
      kind: 'puzzle' as const,
      script,
      word_puzzle,
      next_schedule,
      initial_script_data: { word_msgs: word_game_msgs, title, grid_data }
    };
  });

export const Route = createFileRoute('/padavali/(public)/_public/$slug')({
  loader: async ({ params }) => {
    const result = await loader$({ data: { slug: params.slug } });

    if (result.kind === 'redirect') {
      throw redirect({
        href: `/padavali/${encodeURIComponent(result.targetSlug)}`,
        statusCode: 301
      });
    }
    if (result.kind === 'not_found') throw notFound();
    if (result.kind === 'current_puzzle')
      throw redirect({ to: '/', search: { game: 'padavali' }, hash: 'padavali' });

    return result;
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData
        ? `${loaderData.kind === 'puzzle' ? loaderData.word_puzzle.title : loaderData.title} - Padavali | Fun Sanskrit Puzzle`
        : 'Not Found',
      description: loaderData
        ? loaderData.kind === 'puzzle'
          ? loaderData.word_puzzle.description
          : loaderData.description
        : null,
      share_image_info: shareImageInfoFromAsset(
        loaderData?.kind === 'puzzle'
          ? loaderData.word_puzzle.image
          : loaderData?.kind === 'unavailable'
            ? loaderData.image
            : null
      )
    }),
  component: PadavaliSlugRoute
});

function PadavaliSlugRoute() {
  const data = Route.useLoaderData();

  return (
    <>
      {data.kind === 'unavailable' ? (
        <div className="px-4 py-8 text-center text-muted-foreground">
          This puzzle is not available.
        </div>
      ) : (
        <WordGame
          location="list_page"
          script={data.script}
          id={data.word_puzzle.id}
          puzzle_slug={data.word_puzzle.slug}
          title={data.word_puzzle.title}
          description={data.word_puzzle.description}
          word_list={data.word_puzzle.word_list}
          dims={data.word_puzzle.grid_dimensions}
          grid_data={data.word_puzzle.grid_data}
          initial_script_data={data.initial_script_data}
          next_schedule={data.next_schedule}
          attachments={data.word_puzzle.attachments}
          listed={data.word_puzzle.listed}
        />
      )}
    </>
  );
}

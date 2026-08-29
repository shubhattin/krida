import { createFileRoute, Link, notFound, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { ArrowLeftIcon } from 'lucide-react';
import { transliterate_wasm } from 'lipilekhika';
import { z } from 'zod';
import WordGame from '~/components/pages/padavali/WordGame/WordGameRoot';
import { get_transliterated_word_game_msgs } from '~/components/pages/padavali/WordGame/msgs';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { getScript$ } from '~/lib/cache_server_route_data';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import type { PadavaliPuzzleType } from '~/util/cache.server/padavali_cache';
import { dbRun } from '~/effect/database';
import { runLoaderEffect } from '~/effect/run';

type SlugResolution =
  | { type: 'puzzle'; puzzle: PadavaliPuzzleType }
  | { type: 'redirect'; targetSlug: string }
  | { type: 'not_found' };

const resolve_puzzle_slug = async (slug: string): Promise<SlugResolution> => {
  const word_puzzle = await runLoaderEffect(CACHE.padavali.word_puzzle.get({ slug }));
  if (word_puzzle) {
    return { type: 'puzzle', puzzle: word_puzzle };
  }

  const redirect_entry = await runLoaderEffect(
    dbRun('padavali.resolve_puzzle_slug_redirect', (client) =>
      client.query.padavali_redirects.findFirst({
        where: (tbl, { eq }) => eq(tbl.slug, slug),
        with: {
          puzzle: {
            columns: { slug: true }
          }
        }
      })
    )
  );

  if (redirect_entry?.puzzle?.slug) {
    return { type: 'redirect', targetSlug: redirect_entry.puzzle.slug };
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
        description: word_puzzle.description
      };
    }

    const script = await getScript$();
    const word_game_msgs = await get_transliterated_word_game_msgs(script);
    const title = await transliterate_wasm(word_puzzle.title, DEFAULT_DATA_SCRIPT, script);
    const grid_cells = await transliterate_wasm(
      word_puzzle.grid_data.flat(),
      DEFAULT_DATA_SCRIPT,
      script
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
    if (result.kind === 'current_puzzle') throw redirect({ to: '/padavali' });

    return result;
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData
        ? `${loaderData.kind === 'puzzle' ? loaderData.word_puzzle.title : loaderData.title} - Padavali Puzzle | पदावली`
        : 'Not Found',
      description: loaderData
        ? loaderData.kind === 'puzzle'
          ? loaderData.word_puzzle.description
          : loaderData.description
        : null
    }),
  component: PadavaliSlugRoute
});

function PadavaliSlugRoute() {
  const data = Route.useLoaderData();

  return (
    <>
      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
        <Link
          to="/padavali/puzzles"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Puzzles
        </Link>
      </div>
      {data.kind === 'unavailable' ? (
        <div>This puzzle is not available.</div>
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

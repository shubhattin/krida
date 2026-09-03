import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { ArrowLeftIcon } from 'lucide-react';
import { transliterate } from 'lipilekhika';
import { z } from 'zod';
import WordGame from '~/components/pages/padavali/WordGame/WordGameRoot';
import { get_transliterated_word_game_msgs } from '~/components/pages/padavali/WordGame/msgs';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { getScript$ } from '~/lib/cache_server_route_data';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { parseIdSlugParam } from '~/util/puzzle/slug';
import { runLoaderEffect } from '~/effect/run';
import { PreviewWarningBanner } from './-PreviewWarningBanner';

const loader$ = createServerFn({ method: 'GET' })
  .validator(z.object({ id_slug: z.string() }))
  .handler(async ({ data }) => {
    const routeParams = parseIdSlugParam(data.id_slug);
    if (!routeParams) return { valid: false as const };

    const { id, slug } = routeParams;

    const [word_puzzle, next_schedule] = await Promise.all([
      runLoaderEffect(CACHE.padavali.word_puzzle.get({ slug })),
      runLoaderEffect(CACHE.padavali.next_schedule.get(NO_CACHE_PARAMS))
    ]);

    if (!word_puzzle || word_puzzle.id !== id) return { valid: false as const };

    const script = await getScript$();
    const word_game_msgs = await get_transliterated_word_game_msgs(script);
    const title = await transliterate(word_puzzle.title, DEFAULT_DATA_SCRIPT, script);
    const grid_cells = await transliterate(
      word_puzzle.grid_data.flat(),
      DEFAULT_DATA_SCRIPT,
      script
    );
    let cell_i = 0;
    const grid_data = word_puzzle.grid_data.map((row) => row.map(() => grid_cells[cell_i++]!));

    return {
      valid: true as const,
      script,
      word_puzzle,
      next_schedule,
      initial_script_data: { word_msgs: word_game_msgs, title, grid_data }
    };
  });

export const Route = createFileRoute('/padavali/(public)/_public/view/$id_slug')({
  loader: ({ params }) => loader$({ data: { id_slug: params.id_slug } }),
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData?.valid ? `${loaderData.word_puzzle.title} | पदावली` : 'Not Found',
      description: loaderData?.valid ? loaderData.word_puzzle.description : null,
      robots: 'noindex'
    }),
  component: PadavaliViewRoute
});

function PadavaliViewRoute() {
  const data = Route.useLoaderData();

  if (!data.valid) return <div>Invalid ID</div>;

  return (
    <>
      <PreviewWarningBanner listed={data.word_puzzle.listed} slug={data.word_puzzle.slug} />
      <WordGame
        location="view_page"
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
      >
        <div className="px-4 pt-3 sm:px-6 sm:pt-4">
          <Link
            to="/padavali"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="size-4" />
            Home Page
          </Link>
        </div>
      </WordGame>
    </>
  );
}

import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import WordGame from '~/components/pages/main/WordGame/WordGameRoot';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { get_transliterated_word_game_msgs } from '~/components/pages/main/WordGame/msgs';
import { transliterate_wasm } from 'lipilekhika';
import { getCachedScript } from '~/lib/cache_server_route_data';
import { CACHE, NO_CACHE_PARAMS, type PuzzleType } from '~/util/cache.server/cache_loaders';
import { cache, Suspense } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { getMetadata } from '~/components/tags/getPageMetaTags';
import { db } from '~/db/db';

type Props = { params: Promise<{ slug: string }> };

type SlugResolution =
  | { type: 'puzzle'; puzzle: PuzzleType }
  | { type: 'redirect'; targetSlug: string }
  | { type: 'not_found' };

const resolve_puzzle_slug = cache(async (slug: string): Promise<SlugResolution> => {
  const word_puzzle = await CACHE.word_puzzle.get({ slug });
  if (word_puzzle) {
    return { type: 'puzzle', puzzle: word_puzzle };
  }

  const redirect_entry = await db.query.word_puzzle_redirects.findFirst({
    where: (tbl, { eq }) => eq(tbl.slug, slug),
    with: {
      puzzle: {
        columns: { slug: true }
      }
    }
  });

  if (redirect_entry?.puzzle?.slug) {
    return { type: 'redirect', targetSlug: redirect_entry.puzzle.slug };
  }

  return { type: 'not_found' };
});

const get_puzzle_for_metadata = async (slug: string) => {
  const resolution = await resolve_puzzle_slug(slug);
  if (resolution.type === 'puzzle') {
    return resolution.puzzle;
  }
  if (resolution.type === 'redirect') {
    return CACHE.word_puzzle.get({ slug: resolution.targetSlug });
  }
  return undefined;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const word_puzzle = await get_puzzle_for_metadata(slug);

  return {
    ...getMetadata({
      title: word_puzzle ? word_puzzle.title + ' - Padavali Puzzle | पदावली' : 'Not Found',
      description: word_puzzle ? word_puzzle.description : null
    })
  };
}

const MainEdit = async ({ params }: Props) => {
  const slug = decodeURIComponent((await params).slug);

  return (
    <Suspense fallback={<PuzzleLoadingSkeleton />}>
      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
        <Link
          href="/padavali/puzzles"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Puzzles
        </Link>
      </div>
      <WordGameSuspense slug={slug} />
    </Suspense>
  );
};

export default MainEdit;

const WordGameSuspense = async ({ slug }: { slug: string }) => {
  const resolution = await resolve_puzzle_slug(slug);

  if (resolution.type === 'redirect') {
    permanentRedirect(`/padavali/${encodeURIComponent(resolution.targetSlug)}`);
  }

  if (resolution.type === 'not_found') {
    notFound();
  }

  const word_puzzle = resolution.puzzle;

  const [current_schedule, next_schedule] = await Promise.all([
    CACHE.current_schedule.get(NO_CACHE_PARAMS),
    CACHE.next_schedule.get(NO_CACHE_PARAMS)
  ]);

  if (current_schedule && word_puzzle.id === current_schedule.puzzle.id) {
    redirect('/padavali');
  }

  if (!word_puzzle.listed) return <div>This puzzle is not available.</div>;

  const script = await getCachedScript();
  const word_game_msgs = await get_transliterated_word_game_msgs(script);
  const title = await transliterate_wasm(word_puzzle.title, DEFAULT_DATA_SCRIPT, script);
  const grid = word_puzzle.grid_data;
  const grid_cells = await transliterate_wasm(grid.flat(), DEFAULT_DATA_SCRIPT, script);
  let cell_i = 0;
  const grid_data = grid.map((row) => row.map(() => grid_cells[cell_i++]!));
  return (
    <WordGame
      location="list_page"
      script={script}
      id={word_puzzle.id}
      puzzle_slug={word_puzzle.slug}
      title={word_puzzle.title}
      description={word_puzzle.description}
      word_list={word_puzzle.word_list}
      dims={word_puzzle.grid_dimensions}
      grid_data={word_puzzle.grid_data}
      initial_script_data={{ word_msgs: word_game_msgs, title, grid_data }}
      next_schedule={next_schedule}
      attachments={word_puzzle.attachments}
    ></WordGame>
  );
};

const PuzzleLoadingSkeleton = () => {
  return (
    <div className="w-full bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/padavali/puzzles"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Puzzles
          </Link>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700"></div>
            <div className="mx-auto h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700"></div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700"></div>
            </div>

            <div className="lg:col-span-6">
              <div className="mx-auto h-96 w-full max-w-lg animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700"></div>
            </div>

            <div className="lg:col-span-3">
              <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import { type Metadata } from 'next';
import Link from 'next/link';
import WordGame from '~/components/pages/main/WordGame/WordGameRoot';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { get_transliterated_word_game_msgs } from '~/components/pages/main/WordGame/msgs';
import { transliterate_wasm } from 'lipilekhika';
import { getCachedScript } from '~/lib/cache_server_route_data';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { cache, Suspense } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { getMetadata } from '~/components/tags/getPageMetaTags';

type Props = { params: Promise<{ slug: string }> };

const word_puzzle_get_cached_func = cache((params: { slug: string }) =>
  CACHE.word_puzzle.get(params)
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const word_puzzle = await word_puzzle_get_cached_func({ slug });

  return {
    ...getMetadata({
      title:
        word_puzzle && word_puzzle.listed
          ? word_puzzle.title + ' - Padavali Puzzle | पदावली'
          : 'Not Found',
      description: word_puzzle && word_puzzle.listed ? word_puzzle.description : null
    })
  };
}

const MainEdit = async ({ params }: Props) => {
  const slug = decodeURIComponent((await params).slug);

  return (
    <Suspense fallback={<PuzzleLoadingSkeleton />}>
      <div className="relative">
        <div className="absolute top-4 left-4 z-10 sm:top-6 sm:left-6">
          <Link
            href="/padavali/puzzles"
            className="flex items-center gap-2 bg-white/80 p-1.5 backdrop-blur-sm hover:bg-white sm:p-2 dark:bg-slate-800/80 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
        </div>
        <WordGameSuspense slug={slug} />
      </div>
    </Suspense>
  );
};

export default MainEdit;

const WordGameSuspense = async ({ slug }: { slug: string }) => {
  const [word_puzzle, next_schedule] = await Promise.all([
    word_puzzle_get_cached_func({ slug }),
    CACHE.next_schedule.get(NO_CACHE_PARAMS)
  ]);
  if (word_puzzle && !word_puzzle.listed) return <div>This puzzle is not available.</div>;

  const script = await getCachedScript();
  const word_game_msgs = await get_transliterated_word_game_msgs(script);
  const title = await transliterate_wasm(word_puzzle?.title ?? '', DEFAULT_DATA_SCRIPT, script);
  const grid = word_puzzle?.grid_data ?? [];
  const grid_cells = await transliterate_wasm(grid.flat(), DEFAULT_DATA_SCRIPT, script);
  let cell_i = 0;
  const grid_data = grid.map((row) => row.map(() => grid_cells[cell_i++]!));
  return word_puzzle ? (
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
  ) : (
    <div>अनुचित ID</div>
  );
};

const PuzzleLoadingSkeleton = () => {
  return (
    <div className="w-full bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 w-fit">
          <Link
            href="/padavali/puzzles"
            className="flex items-center gap-2 bg-white/80 p-1.5 backdrop-blur-sm hover:bg-white sm:p-2 dark:bg-slate-800/80 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="size-4" />
            Back
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

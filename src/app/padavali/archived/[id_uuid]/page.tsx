import { z } from 'zod';
import { type Metadata } from 'next';
import Link from 'next/link';
import WordGame from '~/components/pages/main/WordGame/WordGameRoot';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { get_transliterated_word_game_msgs } from '~/components/pages/main/WordGame/msgs';
import { lipi_parivartak } from '~/tools/lipi_lekhika';
import { getCachedScript } from '~/lib/cache_server_route_data';
import { get_next_schedule, get_word_puzzle } from '~/db/db_cache_data';
import { cache, Suspense } from 'react';
import { ArrowLeftIcon } from 'lucide-react';

type Props = { params: Promise<{ id_uuid: string }> };

const word_puzzle_get_cached_func = cache(get_word_puzzle);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [id_str, uuid_str] = decodeURIComponent((await params).id_uuid).split(':');
  const id = z.coerce.number().int().parse(id_str);
  const uuid = z.string().uuid().parse(uuid_str);

  const word_puzzle = await word_puzzle_get_cached_func(id, uuid);

  return {
    title:
      word_puzzle && word_puzzle.archived
        ? word_puzzle.title + ' - Archiived Puzzle | पदावली'
        : 'Not Found'
  };
}

const MainEdit = async ({ params }: Props) => {
  const [id_str, uuid_str] = decodeURIComponent((await params).id_uuid).split(':');
  const id = z.coerce.number().int().parse(id_str);
  const uuid = z.string().uuid().parse(uuid_str);

  return (
    <Suspense fallback={<PuzzleLoadingSkeleton />}>
      <div className="relative">
        <div className="absolute top-4 left-4 z-10 sm:top-6 sm:left-6">
          <Link
            href="/padavali/archived"
            className="flex items-center gap-2 bg-white/80 p-1.5 backdrop-blur-sm hover:bg-white sm:p-2 dark:bg-slate-800/80 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
        </div>
        <WordGameSuspense id={id} uuid={uuid} />
      </div>
    </Suspense>
  );
};

export default MainEdit;

const WordGameSuspense = async ({ id, uuid }: { id: number; uuid: string }) => {
  const [word_puzzle, next_schedule] = await Promise.all([
    word_puzzle_get_cached_func(id, uuid),
    get_next_schedule()
  ]);
  if (word_puzzle && !word_puzzle.archived) return <div>Puzzle {id} is not Archived.</div>;

  const script = await getCachedScript();
  const word_game_msgs = await get_transliterated_word_game_msgs(script);
  const title = await lipi_parivartak(word_puzzle?.title ?? '', DEFAULT_DATA_SCRIPT, script);
  const grid_data = await Promise.all(
    (word_puzzle?.grid_data ?? []).map(
      async (row) => await lipi_parivartak(row, DEFAULT_DATA_SCRIPT, script)
    )
  );
  return word_puzzle ? (
    <WordGame
      location="archive_page"
      script={script}
      id={word_puzzle.id}
      uuid={word_puzzle.uuid}
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

// Loading skeleton component
const PuzzleLoadingSkeleton = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 w-fit">
          <Link
            href="/padavali/archived"
            className="flex items-center gap-2 bg-white/80 p-1.5 backdrop-blur-sm hover:bg-white sm:p-2 dark:bg-slate-800/80 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
        </div>

        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700"></div>
            <div className="mx-auto h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700"></div>
          </div>

          {/* Game layout skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left sidebar skeleton */}
            <div className="lg:col-span-3">
              <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700"></div>
            </div>

            {/* Game grid skeleton */}
            <div className="lg:col-span-6">
              <div className="mx-auto h-96 w-full max-w-lg animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700"></div>
            </div>

            {/* Right sidebar skeleton */}
            <div className="lg:col-span-3">
              <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

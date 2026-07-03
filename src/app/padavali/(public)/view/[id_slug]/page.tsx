import { type Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import WordGame from '~/components/pages/main/WordGame/WordGameRoot';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { get_transliterated_word_game_msgs } from '~/components/pages/main/WordGame/msgs';
import { transliterate_wasm } from 'lipilekhika';
import { getCachedScript } from '~/lib/cache_server_route_data';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { cache } from 'react';
import { getMetadata } from '~/components/tags/getPageMetaTags';
import { parseIdSlugParam } from '~/util/puzzle/slug';
import { PreviewWarningBanner } from './PreviewWarningBanner';

type Props = { params: Promise<{ id_slug: string }> };

const word_puzzle_get_cached_func = cache((params: { slug: string }) =>
  CACHE.word_puzzle.get(params)
);

const parseParams = async (params: Promise<{ id_slug: string }>) => {
  const parsed = parseIdSlugParam((await params).id_slug);
  if (!parsed) return null;
  return parsed;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const routeParams = await parseParams(params);
  if (!routeParams) {
    return getMetadata({ title: 'Not Found', description: null });
  }

  const word_puzzle = await word_puzzle_get_cached_func({ slug: routeParams.slug });
  const isValid = word_puzzle && word_puzzle.id === routeParams.id;

  return {
    ...getMetadata({
      title: isValid ? word_puzzle.title + ' | पदावली' : 'Not Found',
      description: isValid ? word_puzzle.description : null
    }),
    robots: 'noindex'
  };
}

const MainEdit = async ({ params }: Props) => {
  const routeParams = await parseParams(params);
  if (!routeParams) {
    return <div>Invalid ID</div>;
  }

  const { id, slug } = routeParams;

  const [word_puzzle, next_schedule] = await Promise.all([
    word_puzzle_get_cached_func({ slug }),
    CACHE.next_schedule.get(NO_CACHE_PARAMS)
  ]);

  const isValid = word_puzzle && word_puzzle.id === id;

  const script = await getCachedScript();
  const word_game_msgs = await get_transliterated_word_game_msgs(script);
  const title = await transliterate_wasm(word_puzzle?.title ?? '', DEFAULT_DATA_SCRIPT, script);
  const grid = word_puzzle?.grid_data ?? [];
  const grid_cells = await transliterate_wasm(grid.flat(), DEFAULT_DATA_SCRIPT, script);
  let cell_i = 0;
  const grid_data = grid.map((row) => row.map(() => grid_cells[cell_i++]!));

  return (
    <>
      {isValid ? (
        <>
          <PreviewWarningBanner listed={word_puzzle.listed} slug={word_puzzle.slug} />
          <WordGame
            location="view_page"
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
            listed={word_puzzle.listed}
          >
            <div className="px-4 pt-3 sm:px-6 sm:pt-4">
              <Link
                href="/padavali"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ArrowLeftIcon className="size-4" />
                Home Page
              </Link>
            </div>
          </WordGame>
        </>
      ) : (
        <div>Invalid ID</div>
      )}
    </>
  );
};

export default MainEdit;

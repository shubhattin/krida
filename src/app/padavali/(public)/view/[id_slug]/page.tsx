import { type Metadata } from 'next';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import WordGame from '~/components/pages/main/WordGame/WordGameRoot';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { get_transliterated_word_game_msgs } from '~/components/pages/main/WordGame/msgs';
import { transliterate_wasm } from 'lipilekhika';
import { getCachedScript } from '~/lib/cache_server_route_data';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { cache } from 'react';
import { getMetadata } from '~/components/tags/getPageMetaTags';
import { parseIdSlugParam } from '~/util/puzzle/slug';

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
    return <div>अनुचित ID</div>;
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
          >
            <div className="my-3 mb-3 px-4">
              <Link href="/padavali" className="flex items-center gap-1 text-lg font-semibold">
                <IoMdArrowRoundBack className="inline-block text-xl" />
                मुख्यपृष्ठम्
              </Link>
            </div>
          </WordGame>
        </>
      ) : (
        <div>अनुचित ID</div>
      )}
    </>
  );
};

export default MainEdit;

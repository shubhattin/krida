import { Metadata } from 'next';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { get_transliterated_word_game_msgs } from '~/components/pages/padavali/WordGame/msgs';
import { transliterate_wasm } from 'lipilekhika';
import MainPagePadavali from './MainPagePadavali';
import { getCachedScript } from '~/lib/cache_server_route_data';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { getMetadata } from '~/components/tags/getPageMetaTags';
import { NoScheduledPadavali } from '~/components/pages/padavali/NoScheduledPadavali';
import {
  mapListedPuzzlesForDisplay,
  NORMAL_TITLE_SCRIPT
} from '~/components/pages/padavali/listed_puzzle_display';

export const dynamic = 'force-dynamic';

async function buildListedPuzzlesInit(script: Awaited<ReturnType<typeof getCachedScript>>) {
  const listed_puzzles = await CACHE.padavali.listed_puzzle_list.get(NO_CACHE_PARAMS);

  const puzzle_texts = listed_puzzles.flatMap((p) =>
    p.description ? [p.title, p.description] : [p.title]
  );
  const [transliterated_texts, normal_titles] = await Promise.all([
    transliterate_wasm(puzzle_texts, DEFAULT_DATA_SCRIPT, script),
    transliterate_wasm(
      listed_puzzles.map((p) => p.title),
      DEFAULT_DATA_SCRIPT,
      NORMAL_TITLE_SCRIPT
    )
  ]);
  const listed_puzzles_init_transliterated = mapListedPuzzlesForDisplay(
    listed_puzzles,
    transliterated_texts,
    normal_titles
  );

  return { listed_puzzles, listed_puzzles_init_transliterated };
}

export default async function Home() {
  const [current_schedule, next_schedule] = await Promise.all([
    CACHE.padavali.current_schedule.get(NO_CACHE_PARAMS),
    CACHE.padavali.next_schedule.get(NO_CACHE_PARAMS)
  ]);

  if (!current_schedule) {
    const script = await getCachedScript();
    const { listed_puzzles, listed_puzzles_init_transliterated } =
      await buildListedPuzzlesInit(script);

    return (
      <NoScheduledPadavali
        next_schedule={next_schedule}
        listed_puzzles={listed_puzzles}
        listed_puzzles_init_transliterated={listed_puzzles_init_transliterated}
      />
    );
  }

  const word_puzzle = current_schedule.puzzle;

  const script = await getCachedScript();
  const word_game_msgs = await get_transliterated_word_game_msgs(script);
  const title = await transliterate_wasm(word_puzzle.title, DEFAULT_DATA_SCRIPT, script);
  const grid_cells = await transliterate_wasm(
    word_puzzle.grid_data.flat(),
    DEFAULT_DATA_SCRIPT,
    script
  );
  let cell_i = 0;
  const grid_data = word_puzzle.grid_data.map((row) => row.map(() => grid_cells[cell_i++]!));
  return (
    <MainPagePadavali
      script={script}
      word_puzzle={word_puzzle}
      initial_script_data={{ word_msgs: word_game_msgs, title, grid_data }}
      next_schedule={next_schedule}
    />
  );
}

export const metadata: Metadata = {
  ...getMetadata({
    title: 'Padāvalī',
    description:
      'Padavali is a fun, interactive Sanskrit Puzzle that tests your creativity, expands your vocabulary, ' +
      'and lets you challenge your friends to try and beat your score.'
  }),
  keywords:
    'Sanskrit, learning, games, Padavali, word puzzle, Devanagari, Telugu, Kannada, Gujarati, Bengali, Odia, Indian scripts'
};

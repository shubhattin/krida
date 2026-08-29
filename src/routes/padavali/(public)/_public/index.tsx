import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { transliterate_wasm } from 'lipilekhika';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { get_transliterated_word_game_msgs } from '~/components/pages/padavali/WordGame/msgs';
import { getScript$ } from '~/lib/cache_server_route_data';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { NoScheduledPadavali } from '~/components/pages/padavali/NoScheduledPadavali';
import {
  mapListedPuzzlesForDisplay,
  NORMAL_TITLE_SCRIPT
} from '~/components/pages/padavali/listed_puzzle_display';
import { GameCrossPromo } from '~/components/GameCrossPromo';
import { runLoaderEffect } from '~/effect/run';
import MainPagePadavali from './-MainPagePadavali';

const buildListedPuzzlesInit = async (script: Awaited<ReturnType<typeof getScript$>>) => {
  const listed_puzzles = await runLoaderEffect(
    CACHE.padavali.listed_puzzle_list.get(NO_CACHE_PARAMS)
  );

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
};

const loader$ = createServerFn({ method: 'GET' }).handler(async () => {
  const [current_schedule, next_schedule] = await Promise.all([
    runLoaderEffect(CACHE.padavali.current_schedule.get(NO_CACHE_PARAMS)),
    runLoaderEffect(CACHE.padavali.next_schedule.get(NO_CACHE_PARAMS))
  ]);

  const script = await getScript$();

  if (!current_schedule) {
    const { listed_puzzles, listed_puzzles_init_transliterated } =
      await buildListedPuzzlesInit(script);

    return {
      scheduled: false as const,
      next_schedule,
      listed_puzzles,
      listed_puzzles_init_transliterated
    };
  }

  const word_puzzle = current_schedule.puzzle;
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
    scheduled: true as const,
    script,
    word_puzzle,
    next_schedule,
    initial_script_data: { word_msgs: word_game_msgs, title, grid_data }
  };
});

export const Route = createFileRoute('/padavali/(public)/_public/')({
  loader: () => loader$(),
  head: () =>
    routeHeadFromPageMeta({
      title: 'Padāvalī',
      description:
        'Padavali is a fun, interactive Sanskrit Jumbled Words Puzzle that tests your creativity, expands your vocabulary, ' +
        'and lets you challenge your friends to try and beat your score.'
    }),
  component: PadavaliHome
});

function PadavaliHome() {
  const data = Route.useLoaderData();

  return (
    <>
      {data.scheduled ? (
        <MainPagePadavali
          script={data.script}
          word_puzzle={data.word_puzzle}
          initial_script_data={data.initial_script_data}
          next_schedule={data.next_schedule}
        />
      ) : (
        <NoScheduledPadavali
          next_schedule={data.next_schedule}
          listed_puzzles={data.listed_puzzles}
          listed_puzzles_init_transliterated={data.listed_puzzles_init_transliterated}
        />
      )}
      <div className="mx-auto max-w-4xl px-4 pb-12">
        <GameCrossPromo promote="padajala" />
      </div>
    </>
  );
}

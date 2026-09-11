import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { transliterate_wasm } from 'lipilekhika';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { getScript$ } from '~/lib/cache_server_route_data';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import {
  mapListedPuzzlesForDisplay,
  NORMAL_TITLE_SCRIPT
} from '~/components/pages/padavali/listed_puzzle_display';
import { runLoaderEffect } from '~/effect/run';
import { ListedPuzzles } from './-ListedPuzzles';

const loader$ = createServerFn({ method: 'GET' }).handler(async () => {
  const listed_puzzles = await runLoaderEffect(
    CACHE.padavali.listed_puzzle_list.get(NO_CACHE_PARAMS)
  );

  const script = await getScript$();

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

  return { listed_puzzles, script, listed_puzzles_init_transliterated };
});

export const Route = createFileRoute('/padavali/(public)/_public/puzzles/')({
  loader: () => loader$(),
  head: () =>
    routeHeadFromPageMeta({
      title: 'Padavali Puzzles',
      description: 'Browse and play all available Padavali word puzzles'
    }),
  component: PadavaliPuzzlesRoute
});

function PadavaliPuzzlesRoute() {
  const { listed_puzzles, script, listed_puzzles_init_transliterated } = Route.useLoaderData();

  return (
    <ListedPuzzles
      listed_puzzles={listed_puzzles}
      script={script}
      listed_puzzles_init_transliterated={listed_puzzles_init_transliterated}
    />
  );
}

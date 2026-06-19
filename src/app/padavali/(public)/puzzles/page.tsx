import { ListedPuzzles } from './ListedPuzzles';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { transliterate_wasm } from 'lipilekhika';
import { Metadata } from 'next';
import { getCachedScript } from '~/lib/cache_server_route_data';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { getMetadata } from '~/components/tags/getPageMetaTags';
import {
  mapListedPuzzlesForDisplay,
  NORMAL_TITLE_SCRIPT
} from '~/components/pages/main/listed_puzzle_display';

const ListedPage = async () => {
  const listed_puzzles = await CACHE.listed_puzzle_list.get(NO_CACHE_PARAMS);

  const script = await getCachedScript();

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

  return (
    <ListedPuzzles
      listed_puzzles={listed_puzzles}
      script={script}
      listed_puzzles_init_transliterated={listed_puzzles_init_transliterated}
    />
  );
};

export default ListedPage;

export const metadata: Metadata = {
  ...getMetadata({
    title: 'Padavali Puzzles',
    description: 'Browse and play all available Padavali word puzzles'
  })
};

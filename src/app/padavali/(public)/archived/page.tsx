import { ArchivedList } from './ArchivedList';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { transliterate_wasm } from 'lipilekhika';
import { Metadata } from 'next';
import { getCachedScript } from '~/lib/cache_server_route_data';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { getMetadata } from '~/components/tags/getPageMetaTags';

const ArchivedPage = async () => {
  const archived_puzzles = await CACHE.listed_puzzle_list.get(NO_CACHE_PARAMS);

  const script = await getCachedScript();

  const puzzle_texts = archived_puzzles.flatMap((p) =>
    p.description ? [p.title, p.description] : [p.title]
  );
  const transliterated_texts = await transliterate_wasm(puzzle_texts, DEFAULT_DATA_SCRIPT, script);
  let text_i = 0;
  const archived_puzzles_init_transliterlated = archived_puzzles.map((puzzle) => ({
    ...puzzle,
    title: transliterated_texts[text_i++]!,
    description: puzzle.description ? transliterated_texts[text_i++]! : null
  }));

  return (
    <ArchivedList
      archived_puzzles={archived_puzzles}
      script={script}
      archived_puzzles_init_transliterlated={archived_puzzles_init_transliterlated}
    />
  );
};

export default ArchivedPage;

export const metadata: Metadata = {
  ...getMetadata({
    title: 'Archived Puzzles',
    description: 'Play Previous Padavali Word Game Puzzles'
  })
};

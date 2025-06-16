import { ArchivedList } from './ArchivedList';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_font_data';
import { Metadata } from 'next';
import { lipi_parivartak } from '~/tools/lipi_lekhika';
import { getCachedScript } from '~/lib/cache_server_route_data';
import { get_archived_puzzles } from '~/db/db_cache_data';

const ArchivedPage = async () => {
  const archived_puzzles = await get_archived_puzzles();

  const script = await getCachedScript();

  const archived_puzzles_init_transliterlated = await Promise.all(
    archived_puzzles.map(async (puzzle) => ({
      ...puzzle,
      title: await lipi_parivartak(puzzle.title, DEFAULT_DATA_SCRIPT, script)
    }))
  );

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
  title: 'Archived Puzzles',
  description: 'Play Previous Padavali Word Game Puzzles'
};

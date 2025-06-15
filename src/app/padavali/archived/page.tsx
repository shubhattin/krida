import { db } from '~/db/db';
import { ArchivedList } from './ArchivedList';
import {
  DEFAULT_DATA_SCRIPT,
  get_lang_from_cookie,
  SCRIPT_DATA_COOKIE_KEY
} from '~/state/script_font_data';
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import { lipi_parivartak } from '~/tools/lipi_lekhika';

const ArchivedPage = async () => {
  const archived_puzzles = await db.query.word_puzzles.findMany({
    columns: {
      id: true,
      uuid: true,
      title: true
    },
    where: ({ archived }, { eq }) => eq(archived, true)
  });

  const script = get_lang_from_cookie((await cookies()).get(SCRIPT_DATA_COOKIE_KEY)?.value);

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

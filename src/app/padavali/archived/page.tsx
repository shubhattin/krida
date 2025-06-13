import { db } from '~/db/db';
import { ArchivedList } from './ArchivedList';
import { get_lang_from_cookie, SCRIPT_DATA_COOKIE_KEY } from '~/state/script_font_data';
import { cookies } from 'next/headers';
import { Metadata } from 'next';

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

  return <ArchivedList archived_puzzles={archived_puzzles} script={script} />;
};

export default ArchivedPage;

export const metadata: Metadata = {
  title: 'Archived Puzzles',
  description: 'Play Previous Padavali Word Game Puzzles'
};

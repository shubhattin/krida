import { db } from '~/db/db';
import { ArchivedList } from './ArchibeList';

const ArchivedPage = async () => {
  const archived_puzzles = await db.query.word_puzzles.findMany({
    columns: {
      id: true,
      uuid: true
    },
    where: ({ archived }, { eq }) => eq(archived, true)
  });

  return <ArchivedList archived_puzzles={archived_puzzles} />;
};

export default ArchivedPage;

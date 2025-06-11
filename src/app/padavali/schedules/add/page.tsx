import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import get_seesion_from_cookie from '~/lib/get_auth_from_cookie';
import AddSchedule from './AddSchedule';
import { Metadata } from 'next';
import { db } from '~/db/db';

const Main = async () => {
  const session = await get_seesion_from_cookie((await headers()).get('cookie') ?? '');
  if (!session) redirect('/padavali');
  if (session.user.role !== 'admin' || !session.user.is_approved) redirect('/');

  const puzzle_list = await db.query.word_puzzles.findMany({
    columns: {
      id: true,
      title: true
    },
    orderBy: ({ created_at }, { asc }) => asc(created_at)
  });

  return (
    <div className="mt-4">
      <div className="my-4 text-xs dark:text-red-400">
        * All Date and Time entered here will saved according to IST.
      </div>
      <AddSchedule puzzle_list={puzzle_list} />
    </div>
  );
};

export default Main;

export const metadata: Metadata = {
  title: 'नवकालबन्धनं योजय'
};

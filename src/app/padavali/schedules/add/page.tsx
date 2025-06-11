import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import get_seesion_from_cookie from '~/lib/get_auth_from_cookie';
import AddSchedule from './AddSchedule';
import { Metadata } from 'next';
import { db } from '~/db/db';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';

const Main = async () => {
  const session = await get_seesion_from_cookie((await headers()).get('cookie') ?? '');
  if (!session) redirect('/padavali');
  if (session.user.role !== 'admin' || !session.user.is_approved) redirect('/padavali');

  const puzzle_list = await db.query.word_puzzles.findMany({
    columns: {
      id: true,
      title: true
    },
    orderBy: ({ created_at }, { desc }) => desc(created_at)
  });

  return (
    <div className="mt-4">
      <div className="my-2 mb-4 px-2">
        <Link href="/padavali/schedules" className="flex items-center gap-1 text-lg font-semibold">
          <IoMdArrowRoundBack className="inline-block text-xl" />
          <span>कालबन्धनसूची</span>
        </Link>
      </div>
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

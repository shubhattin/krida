import { redirect } from 'next/navigation';
import AddSchedule from './AddSchedule';
import { Metadata } from 'next';
import { db } from '~/db/db';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { getCachedSession } from '~/lib/cache_server_route_data';

const Main = async () => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') redirect('/padavali');

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
      <AddSchedule type="add" />
    </div>
  );
};

export default Main;

export const metadata: Metadata = {
  title: 'नवकालबन्धनं योजय'
};

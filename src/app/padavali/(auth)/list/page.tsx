import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoMdArrowRoundBack } from 'react-icons/io';
import AddPuzzleDialog from './AddPuzzleDialog';
import { Button } from '~/components/ui/button';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CalendarIcon } from 'lucide-react';
import { getCachedSession } from '~/lib/cache_server_route_data';
import ListPage from './ListPage';

dayjs.extend(relativeTime);

const List = async () => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') redirect('/padavali');

  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 px-2">
        <Link href="/padavali" className="inline-flex items-center gap-1.5 text-lg font-semibold">
          <IoMdArrowRoundBack className="size-5 shrink-0" />
          Main Page
        </Link>
      </div>
      <div className="mt-2 mb-5 flex items-center justify-center gap-4 px-2">
        <Link href="/padavali/schedules">
          <Button variant={'outline'} className="inline-flex items-center gap-2 text-base font-semibold">
            <CalendarIcon className="size-4 shrink-0" />
            Schedules
          </Button>
        </Link>
        <AddPuzzleDialog />
      </div>
      <ListPage />
    </div>
  );
};
export default List;

export const metadata: Metadata = {
  title: 'Padavali List'
};

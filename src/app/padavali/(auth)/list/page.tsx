import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoMdAdd, IoMdArrowRoundBack } from 'react-icons/io';
import { Button } from '~/components/ui/button';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CalendarIcon } from 'lucide-react';
import { getCachedSession } from '~/lib/cache_server_route_data';
import ListPage from './ListPage';

dayjs.extend(relativeTime);

const List = async () => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin' || !session.user.is_approved) redirect('/padavali');

  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 px-2">
        <Link href="/padavali" className="flex items-center gap-1 text-lg font-semibold">
          <IoMdArrowRoundBack className="inline-block text-xl" />
          मुख्यपृष्ठं
        </Link>
      </div>
      <div className="mt-2 mb-5 flex items-center justify-center gap-4 px-2">
        <Link href="/padavali/schedules">
          <Button variant={'outline'} className="flex items-center gap-2 text-base font-semibold">
            <CalendarIcon className="-mt-1 inline-block size-4" />
            कालबन्धानि
          </Button>
        </Link>
        <Link href="/padavali/add">
          <Button variant={'outline'} className="gap-2 font-semibold">
            <IoMdAdd className="size-5.5" /> नवप्रहेलिकां युञ्जतु
          </Button>
        </Link>
      </div>
      <ListPage />
    </div>
  );
};
export default List;

export const metadata: Metadata = {
  title: 'पदावली सूची'
};

import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoMdAdd, IoMdArrowRoundBack } from 'react-icons/io';
import { Button } from '~/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { db } from '~/db/db';
import get_seesion_from_cookie from '~/lib/get_auth_from_cookie';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CalendarIcon, RefreshCwIcon } from 'lucide-react';

dayjs.extend(relativeTime);

const List = async () => {
  const session = await get_seesion_from_cookie((await headers()).get('cookie') ?? '');
  if (!session) redirect('/padavali');
  if (session.user.role !== 'admin' || !session.user.is_approved) redirect('/padavali');

  const list = await db.query.word_puzzles.findMany({
    columns: {
      id: true,
      uuid: true,
      title: true,
      created_at: true,
      updated_at: true
    },
    // limit: 10,
    orderBy: ({ created_at }, { desc }) => desc(created_at)
  });

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
          <Button variant={'outline'} className="gap-2 text-lg font-semibold">
            <IoMdAdd className="size-5.5" /> नवप्रहेलिकां युञ्जतु
          </Button>
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((item) => (
          <li key={item.id}>
            <Link href={`/padavali/edit/${item.id}`}>
              <Card className="p-2 transition duration-200 hover:bg-gray-100 hover:dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                    {item.updated_at &&
                      item.updated_at.getTime() !== item.created_at.getTime() &&
                      item.updated_at.getTime() !== 0 && (
                        <>
                          <span className="text-sm text-muted-foreground">
                            {/* <RefreshCwIcon className="mr-1 inline-block h-3 w-3" /> */}
                            Updated: {dayjs(item.updated_at).fromNow()}
                          </span>
                        </>
                      )}
                    <span className="text-sm text-muted-foreground">
                      <CalendarIcon className="mr-1 inline-block size-3" />
                      {dayjs(item.created_at).format('MMM D, YYYY')}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default List;

export const metadata: Metadata = {
  title: 'पदावली सूची'
};

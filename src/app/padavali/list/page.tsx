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

dayjs.extend(relativeTime);

const List = async () => {
  const session = await get_seesion_from_cookie((await headers()).get('cookie') ?? '');
  if (!session) redirect('/padavali');
  if (session.user.role !== 'admin' || !session.user.is_approved) redirect('/');

  const list = await db.query.word_puzzles.findMany({
    columns: {
      id: true,
      uuid: true,
      title: true,
      created_at: true
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
      <div className="mt-2 mb-5 flex items-center justify-center px-2">
        <Link href="/padavali/add">
          <Button variant="blue" className="gap-2 text-lg font-semibold">
            <IoMdAdd className="text-lh" /> नवप्रहेलिकां युञ्जतु
          </Button>
        </Link>
      </div>
      <ul className="space-y-4">
        {list.map((item) => (
          <li key={item.id}>
            <Link href={`/padavali/edit/${item.id}`}>
              <Card className="p-2 transition duration-200 hover:bg-gray-100 hover:dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{dayjs(item.created_at).fromNow()}</CardDescription>
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

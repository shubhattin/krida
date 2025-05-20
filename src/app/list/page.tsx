import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { db } from '~/db/db';
import get_seesion_from_cookie from '~/lib/get_auth_from_cookie';

const List = async () => {
  const session = await get_seesion_from_cookie((await headers()).get('cookie') ?? '');
  if (!session) redirect('/');
  if (session.user.role !== 'admin' || !session.user.is_approved) redirect('/');

  const list = await db.query.word_puzzles.findMany({
    columns: {
      id: true,
      uuid: true,
      title: true,
      created_at: true
    },
    limit: 10,
    orderBy: ({ created_at }, { desc }) => desc(created_at)
  });

  return (
    <div className="container mx-auto p-4">
      <ul className="space-y-4">
        {list.map((item) => (
          <li key={item.id}>
            <Link href={`/view/${item.uuid}`}>
              <Card className="p-2 transition duration-200 hover:bg-gray-100 hover:dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>
                    Created on {new Date(item.created_at).toLocaleDateString()}
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

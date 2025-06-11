import { type Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FiPlus } from 'react-icons/fi';
import { db } from '~/db/db';
import get_seesion_from_cookie from '~/lib/get_auth_from_cookie';
import { Button } from '@/components/ui/button';
import ListSchedules from './ListSchedules';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Card, CardContent } from '~/components/ui/card';

dayjs.extend(relativeTime);

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const Main = async () => {
  const session = await get_seesion_from_cookie((await headers()).get('cookie') ?? '');
  if (!session) redirect('/padavali');
  if (session.user.role !== 'admin' || !session.user.is_approved) redirect('/');

  const schedules = await db.query.puzzle_game_schedules.findMany({
    columns: {
      id: true,
      start_time: true,
      end_time: true,
      created_at: true
    },
    with: {
      puzzle: {
        columns: {
          title: true
        }
      }
    },
    orderBy: (schedules, { desc }) => [desc(schedules.created_at)]
  });

  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 px-2">
        <Link href="/padavali/list" className="flex items-center gap-1 text-lg font-semibold">
          <IoMdArrowRoundBack className="inline-block text-xl" />
          <span>मुख्यसूची</span>
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">कालबन्धानि</h1>
          <p className="mt-1 text-muted-foreground">खेलकालीना कालबन्धानानि</p>
        </div>
        <Button asChild variant={'outline'}>
          <Link href="/padavali/schedules/add" className="flex items-center gap-2">
            <FiPlus className="h-4 w-4" />
            नवकालबन्धनं योजय
          </Link>
        </Button>
      </div>
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 text-muted-foreground">
              <FiPlus className="mx-auto mb-2 h-12 w-12 opacity-50" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">कालबन्धानि नास्ति</h3>
            <p className="mb-4 text-muted-foreground">
              अत्र कोऽपि कालबन्धनं नास्ति। कृपया प्रथमं कालबन्धनं योजयतु।
            </p>
            <Button asChild variant="link">
              <Link href="/padavali/schedules/add" className="flex items-center gap-2">
                <FiPlus className="h-4 w-4" />
                प्रथमकालबन्धनं योजय
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ListSchedules schedules={schedules} />
      )}
    </div>
  );
};

export default Main;

export const metadata: Metadata = {
  title: 'कालबन्धानि'
};

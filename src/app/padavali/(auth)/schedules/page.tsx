import { type Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FiPlus } from 'react-icons/fi';
import { db } from '~/db/db';
import { Button } from '@/components/ui/button';
import ListSchedules, { PastSchedules } from './ListSchedules';
import { Card, CardContent } from '~/components/ui/card';
import { getCachedSession } from '~/lib/cache_server_route_data';

const Main = async () => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') redirect('/padavali');

  const current_time = new Date();
  const uncomming_schedules = await db.query.puzzle_game_schedules.findMany({
    columns: {
      id: true,
      start_time: true,
      end_time: true,
      created_at: true,
      puzzle_id: true
    },
    with: {
      puzzle: {
        columns: {
          title: true
        }
      }
    },
    orderBy: (schedules, { desc }) => [desc(schedules.created_at)],
    where: (schedules, { gte }) => gte(schedules.end_time, current_time)
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
        </div>
        <Button
          render={<Link href="/padavali/schedules/add" className="flex items-center gap-2" />}
          nativeButton={false}
          variant={'outline'}
        >
          <FiPlus className="h-4 w-4" />
          नवकालबन्धनं योजय
        </Button>
      </div>

      {/* Upcoming Schedules Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">आगामिकालबन्धानि</h2>
        {uncomming_schedules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 text-muted-foreground">
                <FiPlus className="mx-auto mb-2 h-12 w-12 opacity-50" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">आगामिकालबन्धानि न सन्ति</h3>
              <p className="mb-4 text-muted-foreground">
                अत्र कोऽपि आगामिकालबन्धनं नास्ति। कृपया प्रथमं कालबन्धनं योजयतु।
              </p>
              <Button
                render={<Link href="/padavali/schedules/add" className="flex items-center gap-2" />}
                nativeButton={false}
                variant="link"
              >
                <FiPlus className="h-4 w-4" />
                प्रथमकालबन्धनं योजय
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ListSchedules upcomming_schedules={uncomming_schedules} />
        )}
        <PastSchedules />
      </div>
    </div>
  );
};

export default Main;

export const metadata: Metadata = {
  title: 'कालबन्धानां सूची'
};

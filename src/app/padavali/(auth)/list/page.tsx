import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AddPuzzleDialog from './AddPuzzleDialog';
import { Button } from '~/components/ui/button';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ArrowLeftIcon, BarChart3Icon, CalendarIcon } from 'lucide-react';
import { getCachedSession } from '~/lib/cache_server_route_data';
import ListPage from './ListPage';

dayjs.extend(relativeTime);

const List = async () => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') redirect('/padavali');

  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 px-2">
        <Link
          href="/padavali"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="size-4 shrink-0" />
          Main Page
        </Link>
      </div>
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-center gap-4 px-2">
        <Button
          render={<Link href="/padavali/analytics" className="inline-flex items-center gap-2" />}
          nativeButton={false}
          variant="outline"
          className="text-base font-semibold"
        >
          <BarChart3Icon className="size-4 shrink-0" />
          Analytics
        </Button>
        <Link href="/padavali/schedules">
          <Button
            variant={'outline'}
            className="inline-flex items-center gap-2 text-base font-semibold"
          >
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

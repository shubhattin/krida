import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense, lazy } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { getCachedSession } from '~/lib/cache_server_route_data';
import { Skeleton } from '~/components/ui/skeleton';

const PuzzleStats = lazy(() => import('../edit/[id]/PuzzleStats'));

const AnalyticsPage = async () => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') redirect('/padavali');

  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 px-2">
        <Link
          href="/padavali/list"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="size-4 shrink-0" />
          Puzzle List
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="space-y-6 p-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-10 w-44" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        }
      >
        <PuzzleStats />
      </Suspense>
    </div>
  );
};

export default AnalyticsPage;

export const metadata: Metadata = {
  title: 'Padavali Analytics'
};

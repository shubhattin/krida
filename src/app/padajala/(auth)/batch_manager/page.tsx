import { type Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { getCachedSession } from '~/lib/cache_server_route_data';
import BatchManagerPage from '~/app/padavali/(auth)/batch_manager/BatchManagerPage';

export default async function CrosswordBatchManagerPage() {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') redirect('/padajala');

  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 px-2">
        <Link
          href="/padajala/list"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="size-4 shrink-0" />
          Puzzle List
        </Link>
      </div>
      <BatchManagerPage game="crossword" />
    </div>
  );
}

export const metadata: Metadata = {
  title: 'Crossword Batch Manager'
};

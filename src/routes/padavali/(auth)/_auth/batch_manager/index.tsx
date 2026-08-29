import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import BatchManagerPage from './-BatchManagerPage';

export const Route = createFileRoute('/padavali/(auth)/_auth/batch_manager/')({
  head: () => routeHeadFromPageMeta({ title: 'Padavali Batch Manager' }),
  component: BatchManager
});

function BatchManager() {
  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 px-2">
        <Link
          to="/padavali/list"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="size-4 shrink-0" />
          Puzzle List
        </Link>
      </div>
      <BatchManagerPage game="padavali" />
    </div>
  );
}

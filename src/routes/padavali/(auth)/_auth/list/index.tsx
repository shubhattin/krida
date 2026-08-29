import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeftIcon, BarChart3Icon, CalendarIcon, LayersIcon } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import AddPuzzleDialog from './-AddPuzzleDialog';
import ListPage from './-ListPage';

export const Route = createFileRoute('/padavali/(auth)/_auth/list/')({
  head: () => routeHeadFromPageMeta({ title: 'Padavali List' }),
  component: PadavaliListRoute
});

function PadavaliListRoute() {
  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 px-2">
        <Link
          to="/padavali"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="size-4 shrink-0" />
          Main Page
        </Link>
      </div>
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-center gap-4 px-2">
        <Button
          render={<Link to="/padavali/analytics" className="inline-flex items-center gap-2" />}
          nativeButton={false}
          variant="outline"
          className="text-base font-semibold"
        >
          <BarChart3Icon className="size-4 shrink-0" />
          Analytics
        </Button>
        <Link to="/padavali/schedules">
          <Button
            variant={'outline'}
            className="inline-flex items-center gap-2 text-base font-semibold"
          >
            <CalendarIcon className="size-4 shrink-0" />
            Schedules
          </Button>
        </Link>
        <Button
          render={<Link to="/padavali/batch_manager" className="inline-flex items-center gap-2" />}
          nativeButton={false}
          variant="outline"
          className="text-base font-semibold"
        >
          <LayersIcon className="size-4 shrink-0" />
          Batch Manager
        </Button>
        <AddPuzzleDialog />
      </div>
      <ListPage />
    </div>
  );
}

import { createFileRoute, redirect } from '@tanstack/react-router';
import { CalendarIcon } from 'lucide-react';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubHeader } from '~/components/hub/HubHeader';
import { SchedulesManager } from '~/components/pages/schedules/SchedulesManager';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';

export const Route = createFileRoute('/schedules')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user || session.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
    return { session };
  },
  head: () =>
    routeHeadFromPageMeta({
      title: 'Schedules | Krida',
      project: 'landing_page',
      description: 'Schedule puzzles across every game.',
      robots: 'noindex'
    }),
  component: SchedulesRoute
});

function SchedulesRoute() {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
        <header className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <CalendarIcon className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            Schedules
          </h1>
          <p className="text-sm text-muted-foreground">
            Queue a puzzle for any game. The home page still shows the current Padavali and
            crossword slots.
          </p>
        </header>
        <SchedulesManager />
      </main>
    </div>
  );
}

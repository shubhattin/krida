import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FiPlus } from 'react-icons/fi';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { adminServerFnMiddleware } from '~/lib/adminServerFn';
import { dbRun } from '~/effect/database';
import { runLoaderEffect } from '~/effect/run';
import ListSchedules, { PastSchedules } from './-ListSchedules';

const loader$ = createServerFn({ method: 'GET' })
  .middleware([adminServerFnMiddleware])
  .handler(async () => {
    const current_time = new Date();
    const upcomming_schedules = await runLoaderEffect(
      dbRun('padavali.admin.list_upcoming_schedules', (client) =>
        client.query.padavali_schedules.findMany({
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
        })
      )
    );

    return { upcomming_schedules };
  });

export const Route = createFileRoute('/padavali/(auth)/_auth/schedules/')({
  loader: () => loader$(),
  head: () => routeHeadFromPageMeta({ title: 'Schedule List' }),
  component: PadavaliSchedulesRoute
});

function PadavaliSchedulesRoute() {
  const { upcomming_schedules } = Route.useLoaderData();

  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 px-2">
        <Link
          to="/padavali/list"
          className="inline-flex items-center gap-1.5 text-lg font-semibold"
        >
          <IoMdArrowRoundBack className="size-5 shrink-0" />
          <span>Main List</span>
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedules</h1>
        </div>
        <Button
          render={<Link to="/padavali/schedules/add" className="inline-flex items-center gap-2" />}
          nativeButton={false}
          variant={'outline'}
        >
          <FiPlus className="size-4 shrink-0" />
          Add Schedule
        </Button>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Upcoming Schedules</h2>
        {upcomming_schedules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 text-muted-foreground">
                <FiPlus className="mx-auto mb-2 h-12 w-12 opacity-50" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No Upcoming Schedules</h3>
              <p className="mb-4 text-muted-foreground">
                There are no upcoming schedules. Please add a schedule first.
              </p>
              <Button
                render={
                  <Link to="/padavali/schedules/add" className="inline-flex items-center gap-2" />
                }
                nativeButton={false}
                variant="link"
              >
                <FiPlus className="size-4 shrink-0" />
                Add First Schedule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ListSchedules upcomming_schedules={upcomming_schedules} />
        )}
        <PastSchedules />
      </div>
    </div>
  );
}

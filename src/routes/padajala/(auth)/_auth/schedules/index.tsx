import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, gte } from 'drizzle-orm';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FiPlus } from 'react-icons/fi';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { adminServerFnMiddleware } from '~/lib/adminServerFn';
import { puzzle_schedules, puzzles } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { runLoaderEffect } from '~/effect/run';
import ListSchedules, { PastSchedules } from './-ListSchedules';

const loader$ = createServerFn({ method: 'GET' })
  .middleware([adminServerFnMiddleware])
  .handler(async () => {
    const current_time = new Date();
    const rows = await runLoaderEffect(
      dbRunHttp('crossword.admin.list_upcoming_schedules', (client) =>
        client
          .select({
            id: puzzle_schedules.id,
            start_time: puzzle_schedules.start_time,
            end_time: puzzle_schedules.end_time,
            created_at: puzzle_schedules.created_at,
            puzzle_id: puzzle_schedules.puzzle_id,
            puzzle_title: puzzles.title
          })
          .from(puzzle_schedules)
          .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
          .where(
            and(eq(puzzles.kind, 'crossword'), gte(puzzle_schedules.end_time, current_time))
          )
          .orderBy(desc(puzzle_schedules.created_at))
      )
    );

    const upcomming_schedules = rows.map(
      ({ puzzle_title, ...schedule }) => ({
        ...schedule,
        puzzle: { title: puzzle_title }
      })
    );

    return { upcomming_schedules };
  });

export const Route = createFileRoute('/padajala/(auth)/_auth/schedules/')({
  loader: () => loader$(),
  head: () => routeHeadFromPageMeta({ title: 'Crossword Schedules', project: 'padajala' }),
  component: CrosswordSchedulesRoute
});

function CrosswordSchedulesRoute() {
  const { upcomming_schedules } = Route.useLoaderData();

  return (
    <>
      <div className="my-2 mb-3.5 flex items-center gap-6 px-2 sm:gap-9">
        <Link
          to="/padajala/list"
          className="inline-flex items-center gap-1.5 text-lg font-semibold"
        >
          <IoMdArrowRoundBack className="size-5 shrink-0" />
          Main List
        </Link>
        <Link to="/padajala/schedules/add">
          <Button variant="outline" className="gap-2">
            <FiPlus className="size-4" />
            Add Schedule
          </Button>
        </Link>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ListSchedules upcomming_schedules={upcomming_schedules} />
          <PastSchedules />
        </CardContent>
      </Card>
    </>
  );
}

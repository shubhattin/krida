import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { z } from 'zod';
import { adminServerFnMiddleware } from '~/lib/adminServerFn';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { dbRun } from '~/effect/database';
import { runLoaderEffect } from '~/effect/run';
import AddSchedule from '../add/-AddSchedule';

const loader$ = createServerFn({ method: 'GET' })
  .middleware([adminServerFnMiddleware])
  .validator(z.object({ rawId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const parsed = z.coerce.number().int().safeParse(data.rawId);
    if (!parsed.success) return { schedule: null };

    const schedule = await runLoaderEffect(
      dbRun('padavali.admin.get_schedule_for_edit', (client) =>
        client.query.padavali_schedules.findFirst({
          where: (tbl, { eq }) => eq(tbl.id, parsed.data),
          with: {
            puzzle: {
              columns: {
                title: true,
                id: true
              }
            }
          }
        })
      )
    );

    return { schedule: schedule ?? null };
  });

export const Route = createFileRoute('/padavali/(auth)/_auth/schedules/edit/$id')({
  loader: async ({ params }) => {
    const { schedule } = await loader$({ data: { rawId: params.id } });
    if (!schedule) throw redirect({ to: '/padavali/schedules' });
    return { schedule };
  },
  head: () => routeHeadFromPageMeta({ title: 'Edit Schedule' }),
  component: EditScheduleRoute
});

function EditScheduleRoute() {
  const { schedule } = Route.useLoaderData();
  const schedule_id = schedule.id;

  const start_date = schedule.start_time;
  const end_date = schedule.end_time;

  const start_time_string = start_date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
    hour12: false
  });
  const end_time_string = end_date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
    hour12: false
  });

  return (
    <div className="mt-4">
      <div className="my-2 mb-4 px-2">
        <Link
          to="/padavali/schedules"
          className="inline-flex items-center gap-1.5 text-lg font-semibold"
        >
          <IoMdArrowRoundBack className="size-5 shrink-0" />
          <span>Schedule List</span>
        </Link>
      </div>
      <div className="my-4 text-xs dark:text-red-400">
        * All Date and Time entered here will saved according to IST.
      </div>
      <AddSchedule
        type="edit"
        init={{
          start_date: start_date,
          end_date: end_date,
          start_time_string: start_time_string,
          end_time_string: end_time_string
        }}
        schedule_id={schedule_id}
        puzzle_title={schedule.puzzle.title}
        puzzle_id={schedule.puzzle.id}
      />
    </div>
  );
}

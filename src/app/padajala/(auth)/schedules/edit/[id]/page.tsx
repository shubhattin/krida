import { redirect } from 'next/navigation';
import AddSchedule from '../../add/AddSchedule';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { getCachedSession } from '~/lib/cache_server_route_data';
import { z } from 'zod';
import { Metadata } from 'next';
import { runServerEffect } from '~/effect/run';
import { dbRun } from '~/effect/database';

type Props = { params: Promise<{ id: string }> };

const Main = async ({ params }: Props) => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') redirect('/padajala');

  const schedule_id_parsed = z.object({ id: z.coerce.number().int() }).safeParse(await params);
  if (!schedule_id_parsed.success) redirect('/padajala/schedules');
  const schedule_id = schedule_id_parsed.data.id;

  const schedule = await runServerEffect(
    dbRun('crossword.admin.get_schedule_for_edit', (client) =>
      client.query.crossword_schedules.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, schedule_id),
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

  if (!schedule) redirect('/padajala/schedules');

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
          href="/padajala/schedules"
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
};

export default Main;

export const metadata: Metadata = {
  title: 'Edit Crossword Schedule'
};

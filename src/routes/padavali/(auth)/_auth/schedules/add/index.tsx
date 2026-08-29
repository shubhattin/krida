import { createFileRoute, Link } from '@tanstack/react-router';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import AddSchedule from './-AddSchedule';

export const Route = createFileRoute('/padavali/(auth)/_auth/schedules/add/')({
  head: () => routeHeadFromPageMeta({ title: 'Add Schedule' }),
  component: PadavaliAddScheduleRoute
});

function PadavaliAddScheduleRoute() {
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
      <AddSchedule type="add" />
    </div>
  );
}

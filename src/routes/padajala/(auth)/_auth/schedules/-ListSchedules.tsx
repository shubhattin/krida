'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import dayjs from 'dayjs';
import { ClockIcon, PencilIcon, SquareArrowOutUpRightIcon } from 'lucide-react';
import { Card, CardContent, CardTitle, CardHeader, CardAction } from '~/components/ui/card';
import relativeTime from 'dayjs/plugin/relativeTime';
import { MdDeleteOutline } from 'react-icons/md';
import { useTRPC } from '~/api/client';
import { toast } from 'sonner';
import { useState, useTransition } from 'react';
import { Link, useRouter } from '@tanstack/react-router';

dayjs.extend(relativeTime);

type Props = {
  upcomming_schedules: {
    id: number;
    puzzle_id: number;
    start_time: Date;
    end_time: Date;
    created_at: Date;
    puzzle: {
      title: string;
    };
  }[];
};

const IST_TZ = 'Asia/Kolkata';

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: IST_TZ
  });
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: IST_TZ
  });
};

const formatScheduleRange = (startTime: Date, endTime: Date) => {
  return `${formatDate(startTime)}, ${formatTime(startTime)} – ${formatDate(endTime)}, ${formatTime(endTime)}`;
};

const ScheduleCardTitle = ({ title, puzzleId }: { title: string; puzzleId: number }) => (
  <CardTitle className="flex items-center gap-2 text-base leading-snug font-semibold">
    <span className="min-w-0 flex-1">{title}</span>
    <a
      href={`/padajala/edit/${puzzleId}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open puzzle editor for ${title}`}
      className="inline-flex shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-blue-500"
    >
      <SquareArrowOutUpRightIcon className="size-3.5" />
    </a>
  </CardTitle>
);

const ScheduleCardMeta = ({
  startTime,
  endTime,
  createdAt
}: {
  startTime: Date;
  endTime: Date;
  createdAt: Date;
}) => (
  <div className="space-y-1.5">
    <p className="text-sm leading-relaxed text-muted-foreground">
      {formatScheduleRange(startTime, endTime)}
    </p>
    <div className="flex items-center gap-1.5 text-sm leading-none text-muted-foreground">
      <span className="inline-flex items-center justify-center">
        <ClockIcon className="size-3.5" />
      </span>
      <span className="leading-normal">{dayjs(createdAt).fromNow()}</span>
    </div>
  </div>
);

const ListSchedules = ({ upcomming_schedules }: Props) => {
  const [, startTransition] = useTransition();
  const trpc = useTRPC();
  const router = useRouter();

  const del_schedule_mutation = useMutation(
    trpc.crossword.schedules.delete_puzzle_schedule.mutationOptions({
      onSuccess() {
        startTransition(async () => {
          toast.success('Successfully deleted schedule');
          await router.invalidate();
        });
      },
      onError() {
        toast.error('Failed to delete schedule');
      }
    })
  );

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {upcomming_schedules.map((schedule) => (
          <Card key={schedule.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="items-center gap-2">
              <ScheduleCardTitle title={schedule.puzzle.title} puzzleId={schedule.puzzle_id} />
              <CardAction className="flex items-center gap-1 self-center">
                <Link
                  to="/padajala/schedules/edit/$id"
                  params={{ id: String(schedule.id) }}
                  aria-label={`Edit schedule for ${schedule.puzzle.title}`}
                  className="inline-flex items-center justify-center p-1 text-muted-foreground hover:text-blue-500"
                >
                  <PencilIcon className="size-4" />
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`Delete schedule for ${schedule.puzzle.title}`}
                        className="inline-flex cursor-pointer items-center justify-center p-1 outline-none hover:brightness-75"
                        disabled={del_schedule_mutation.isPending}
                      />
                    }
                  >
                    <MdDeleteOutline className="size-4 text-rose-400" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this schedule? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          del_schedule_mutation.mutate({ schedule_id: schedule.id });
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ScheduleCardMeta
                startTime={schedule.start_time}
                endTime={schedule.end_time}
                createdAt={schedule.created_at}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ListSchedules;

export const PastSchedules = () => {
  const [value, setValue] = useState<string[]>([]);
  const trpc = useTRPC();

  const past_schedules_q = useQuery(
    trpc.crossword.schedules.get_past_schedules.queryOptions(undefined, {
      enabled: value.includes('past-schedules')
    })
  );

  return (
    <div className="mt-8">
      <Accordion className="w-full" value={value} onValueChange={setValue}>
        <AccordionItem
          value="past-schedules"
          className="rounded-xl border border-border/60 bg-card/40 px-4"
        >
          <AccordionTrigger className="py-4 text-lg font-semibold hover:no-underline focus-visible:border-transparent">
            Past Schedules
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div>
              {past_schedules_q.isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="transition-shadow hover:shadow-md">
                      <CardHeader className="gap-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : past_schedules_q.data && past_schedules_q.data.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {past_schedules_q.data.map((schedule) => (
                    <Card key={schedule.id} className="transition-shadow hover:shadow-md">
                      <CardHeader className="gap-2">
                        <ScheduleCardTitle
                          title={schedule.puzzle.title}
                          puzzleId={schedule.puzzle_id}
                        />
                      </CardHeader>
                      <CardContent>
                        <ScheduleCardMeta
                          startTime={schedule.start_time}
                          endTime={schedule.end_time}
                          createdAt={schedule.created_at}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : past_schedules_q.data ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 text-muted-foreground">
                      <ClockIcon className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">No Past Schedules</h3>
                    <p className="text-muted-foreground">There are no past schedules here.</p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

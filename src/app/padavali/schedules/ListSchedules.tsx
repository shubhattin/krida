'use client';

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
import { client_q } from '~/api/client';
import { toast } from 'sonner';
import { useState, useTransition } from 'react';
import { invalidatePage } from '~/tools/invalidate_nextjs_server_route';
import { Button } from '~/components/ui/button';
import Link from 'next/link';

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

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const ListSchedules = ({ upcomming_schedules }: Props) => {
  const [isPending, startTransition] = useTransition();

  const del_schedule_mutation = client_q.schedules.delete_puzzle_schedule.useMutation({
    onSuccess() {
      startTransition(async () => {
        toast.success('Successfully deleted schedule');
        await invalidatePage('/padavali/schedules');
      });
    },
    onError() {
      toast.error('Failed to delete schedule');
    }
  });

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {upcomming_schedules.map((schedule) => (
          <Card key={schedule.id} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-x-3 text-lg">
                {schedule.puzzle.title}
                <a href={`/padavali/edit/${schedule.puzzle_id}`} target="_blank">
                  <SquareArrowOutUpRightIcon className="-mt-2 size-4 hover:text-blue-500" />
                </a>
              </CardTitle>
              <CardAction className="flex items-center gap-x-2">
                <Link
                  href={`/padavali/schedules/edit/${schedule.id}`}
                  className="hover:text-blue-500"
                >
                  <PencilIcon className="size-4" />
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="cursor-pointer p-1 outline-none hover:brightness-75"
                      disabled={del_schedule_mutation.isPending}
                    >
                      <MdDeleteOutline className="size-4 text-rose-400" />
                    </button>
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
            <CardContent className="-mt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-x-1 text-sm">
                  <div>
                    {formatDate(schedule.start_time)},
                    <span className="ml-1">{dayjs(schedule.start_time).format('HH:mm')}</span>
                  </div>
                  <div>-</div>
                  <div>
                    {formatDate(schedule.end_time)},
                    <span className="">{dayjs(schedule.end_time).format('HH:mm')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClockIcon className="-mt-1 size-4" />
                  <span>{dayjs(schedule.created_at).fromNow()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ListSchedules;

export const PastSchedules = () => {
  const [value, setValue] = useState<string | undefined>(undefined);

  const past_schedules_q = client_q.schedules.get_past_schedules.useQuery(undefined, {
    enabled: !!value
  });

  return (
    <div className="mt-8">
      <Accordion
        type="single"
        collapsible
        className="w-full"
        value={value}
        onValueChange={setValue}
      >
        <AccordionItem value="past-schedules">
          <AccordionTrigger className="text-xl font-semibold">भूतकालबन्धानि</AccordionTrigger>
          <AccordionContent>
            <div className="py-4">
              {past_schedules_q.isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="transition-shadow hover:shadow-md">
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent className="-mt-6">
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
                    <Card
                      key={schedule.id}
                      className="opacity-75 transition-shadow hover:shadow-md"
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-x-3 text-lg">
                          {schedule.puzzle.title}
                          <a href={`/padavali/edit/${schedule.puzzle_id}`} target="_blank">
                            <SquareArrowOutUpRightIcon className="-mt-2 size-4 hover:text-blue-500" />
                          </a>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="-mt-6">
                        <div className="space-y-2">
                          <div className="space-x-1 text-sm">
                            <span>
                              {formatDate(schedule.start_time)} - {formatDate(schedule.end_time)},
                            </span>
                            <span className="text-xs">
                              {dayjs(schedule.start_time).format('HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ClockIcon className="-mt-1 size-4" />
                            <span>{dayjs(schedule.created_at).fromNow()}</span>
                          </div>
                        </div>
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
                    <h3 className="mb-2 text-lg font-semibold">भूतकालबन्धानि न सन्ति</h3>
                    <p className="text-muted-foreground">अत्र कोऽपि भूतकालबन्धनं नास्ति।</p>
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

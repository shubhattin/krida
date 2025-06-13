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
import dayjs from 'dayjs';
import { ClockIcon } from 'lucide-react';
import { Card, CardContent, CardTitle, CardHeader, CardAction } from '~/components/ui/card';
import relativeTime from 'dayjs/plugin/relativeTime';
import { MdDeleteOutline } from 'react-icons/md';
import { client_q } from '~/api/client';
import { toast } from 'sonner';
import { useTransition } from 'react';
import { invalidatePage } from '~/tools/invalidate_nextjs_server_route';

dayjs.extend(relativeTime);

type Props = {
  schedules: {
    id: number;
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

const ListSchedules = ({ schedules }: Props) => {
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
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {schedules.map((schedule) => (
        <Card key={schedule.id} className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">{schedule.puzzle.title}</CardTitle>
            <CardAction>
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
              <div className="text-xs">
                {formatDate(schedule.start_time)} - {formatDate(schedule.end_time)}
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
  );
};

export default ListSchedules;

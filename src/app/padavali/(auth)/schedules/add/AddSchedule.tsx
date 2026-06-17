'use client';

import { useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { ChevronDownIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { client, client_q } from '~/api/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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
} from '~/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '~/lib/utils';
import { LanguageIcon } from '~/components/icons';
import { Switch } from '~/components/ui/switch';
import Icon from '~/tools/Icon';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { useQuery } from '@tanstack/react-query';

export const DEFAULT_START_END_TIME = '21:00';
const PUZZLE_FETCH_LIMIT = 10;

type Props =
  | {
      type: 'add';
    }
  | {
      init: {
        start_date: Date;
        end_date: Date;
        start_time_string: string;
        end_time_string: string;
      };
      type: 'edit';
      puzzle_title: string;
      schedule_id: number;
      puzzle_id: number;
    };

const AddSchedule = (props: Props) => {
  const { type } = props;
  const [startDate, setStartDate] = useState<Date | undefined>(
    type === 'edit' ? props.init.start_date : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    type === 'edit' ? props.init.end_date : undefined
  );
  const [puzzleId, setPuzzleId] = useState<number | undefined>(undefined);

  const [startTime, setStartTime] = useState<string>(
    (type === 'edit' ? props.init.start_time_string : DEFAULT_START_END_TIME) + ':00'
  );
  const [endTime, setEndTime] = useState<string>(
    (type === 'edit' ? props.init.end_time_string : DEFAULT_START_END_TIME) + ':00'
  );

  const router = useRouter();
  const [search_title, setSearchTitle] = useState('');
  const [lipi_lekhika_typing, setLipiLekhikaTyping] = useState(true);

  // Debounce search input to avoid redundant requests
  const [debouncedSearchTitle, setDebouncedSearchTitle] = useState(search_title);
  const DEBOUNCE_TIME = 400;
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTitle(search_title);
    }, DEBOUNCE_TIME);
    return () => clearTimeout(timeoutId);
  }, [search_title]);

  const add_schedule_mut = client_q.schedules.add_puzzle_schedule.useMutation({
    onSuccess(data) {
      if (data.success) {
        toast.success('Schedule added successfully');
        router.push(`/padavali/schedules`);
      } else if (data.error_code === 'already_exists_in_time_range') {
        toast.error('A schedule already exists in the time range');
      }
    },
    onError(error) {
      toast.error('Failed to add schedule');
    }
  });

  const update_schedule_mut = client_q.schedules.update_puzzle_schedule.useMutation({
    onSuccess(data) {
      if (data.success) {
        toast.success('Schedule updated successfully');
        router.push(`/padavali/schedules`);
      }
    },
    onError(error) {
      toast.error('Failed to update schedule');
    }
  });

  const invalid_state_condition =
    (type === 'add' && !puzzleId) ||
    !startDate ||
    !endDate ||
    startDate > endDate ||
    startDate === endDate;

  const handle_add_schedule = () => {
    if (type !== 'add') return;
    if (invalid_state_condition || !puzzleId) {
      toast.error('Please fill all the fields correctly');
      return;
    }
    add_schedule_mut.mutate({ puzzle_id: puzzleId, start_time: startDate, end_time: endDate });
  };

  const handle_update_schedule = () => {
    if (type !== 'edit') return;
    if (invalid_state_condition) {
      toast.error('Please fill all the fields correctly');
      return;
    }
    update_schedule_mut.mutate({
      schedule_id: props.schedule_id,
      puzzle_id: props.puzzle_id,
      start_time: startDate,
      end_time: endDate
    });
  };

  const [pageLastId, setPageLastId] = useState<number | undefined>(undefined);
  const [pageLastCreatedOrUpdatedAt, setPageLastCreatedOrUpdatedAt] = useState<Date | undefined>(
    undefined
  );
  const [moreItemsToFetch, setMoreItemsToFetch] = useState(true);

  const puzzle_list_q = useQuery({
    queryKey: ['puzzle_list_archived'],
    queryFn: async () => {
      const data = client.puzzle.get_puzzle_list_page.query({
        limit: PUZZLE_FETCH_LIMIT,
        archived_filter: false,
        search_title: debouncedSearchTitle !== '' ? debouncedSearchTitle : undefined,
        sort_by: 'created_at',
        last_id: pageLastId,
        last_created_or_updated_at: pageLastCreatedOrUpdatedAt
      });
      return data;
    },
    enabled: type === 'add',
    // keep old data while fetching next page to avoid UI flicker
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    puzzle_list_q.refetch();
  }, [debouncedSearchTitle, pageLastId, pageLastCreatedOrUpdatedAt]);

  const [puzzle_list, setPuzzleList] = useState<NonNullable<typeof puzzle_list_q.data>>([]);
  useEffect(() => {
    if (puzzle_list_q.isSuccess && !puzzle_list_q.isLoading) {
      setPuzzleList((prev) => [...prev, ...(puzzle_list_q.data ?? [])]);
      const fetched = puzzle_list_q.data ?? [];
      setMoreItemsToFetch(fetched.length === PUZZLE_FETCH_LIMIT || fetched.length === 0);
      // ^ if extactly the number of items fetched is the limit, then there are no more items to fetch
    }
  }, [puzzle_list_q.data, puzzle_list_q.isSuccess, puzzle_list_q.isLoading]);
  useEffect(() => {
    // reset on search
    setPuzzleList([]);
    setPageLastId(undefined);
    setPageLastCreatedOrUpdatedAt(undefined);
    setMoreItemsToFetch(true);
    setPuzzleId(undefined);
    // console.log('resetting', /[debouncedSearchTitle]);
    if (debouncedSearchTitle === '') {
      // manually refetch when search is cleared
      puzzle_list_q.refetch();
    }
  }, [debouncedSearchTitle]);

  const handleLoadMore = () => {
    if (puzzle_list.length === 0) return;
    const last = puzzle_list[puzzle_list.length - 1];
    setPageLastId(last.id);
    setPageLastCreatedOrUpdatedAt(last.created_at);
  };

  const ctx = createTypingContext('Devanagari');
  useEffect(() => {
    ctx.ready;
  }, [ctx]);

  return (
    <div className="flex flex-col gap-6">
      {type === 'edit' && (
        <div className="text-lg font-bold">
          {props.puzzle_title},{' '}
          <span className="text-sm font-semibold">Schedule ID: {props.schedule_id}</span>
        </div>
      )}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Select Date Range</h3>
        <div className="flex gap-4">
          <ISTDateTimePicker
            date={startDate}
            onChangeDate={setStartDate}
            label="Start Date"
            start_end_time={startTime}
            type="start"
          />
          <div className="flex w-32 flex-col gap-3">
            <Label htmlFor="time" className="px-1">
              Start Time
            </Label>
            <Input
              type="time"
              id="time"
              step="1"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <ISTDateTimePicker
            date={endDate}
            disabled={!startDate}
            onChangeDate={setEndDate}
            label="End Date"
            start_end_time={endTime}
            type="end"
            disable_before={startDate}
          />
          <div className="flex w-32 flex-col gap-3">
            <Label htmlFor="time" className="px-1">
              End Time
            </Label>
            <Input
              type="time"
              id="time"
              step="1"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {startDate && endDate && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <div>
              Start Time:{' '}
              <span>
                {startDate.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZoneName: 'short',
                  hour12: false
                })}
              </span>
            </div>
            <div>
              End Time:{' '}
              <span>
                {endDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZoneName: 'short',
                  hour12: false
                })}
              </span>
            </div>
          </div>
        )}
      </div>
      {type === 'add' && (
        <div className="flex flex-col gap-3">
          <div className="px-1 text-lg font-bold">Select Puzzle</div>
          <div className="flex flex-col gap-3">
            <Label className="px-1 font-semibold">Search Puzzle</Label>
            <div className="flex items-center gap-4">
              <SearchIcon className="size-5 text-muted-foreground" />
              <Input
                value={search_title}
                onChange={(e) => setSearchTitle(e.currentTarget.value)}
                onBeforeInput={(e) =>
                  handleTypingBeforeInputEvent(
                    ctx,
                    e,
                    (newValue) => setSearchTitle(newValue),
                    lipi_lekhika_typing
                  )
                }
                onBlur={() => ctx.clearContext()}
                onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
                placeholder="Search puzzle by title"
                className="w-2/3 sm:w-1/2 lg:w-1/3"
              />
              <div className="flex justify-center">
                <Label className="inline-flex items-center justify-center gap-2 font-medium">
                  <Switch
                    checked={lipi_lekhika_typing}
                    onCheckedChange={setLipiLekhikaTyping}
                    className="-mt-1"
                  />
                  <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
                  <span className="text-base font-bold">देवनागरी</span>
                </Label>
              </div>
            </div>
          </div>
          {puzzle_list_q.isLoading && <Skeleton className="h-52 w-full" />}
          {puzzle_list_q.isSuccess && !puzzle_list_q.isLoading && (
            <div className="space-y-3">
              <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-scroll rounded-md border border-gray-200 bg-gray-50/50 p-3 sm:grid-cols-3 lg:grid-cols-4 dark:border-gray-700 dark:bg-gray-800/50">
                {puzzle_list.length > 0 ? (
                  puzzle_list.map((puzzle) => (
                    <button
                      key={puzzle.id}
                      className={cn(
                        'rounded-md border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 ease-in-out outline-none',
                        'hover:shadow-md focus:ring-2 focus:ring-blue-500/50',
                        puzzleId === puzzle.id
                          ? 'border-blue-400 bg-blue-100 text-blue-900 shadow-md dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-100'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:bg-blue-900/20'
                      )}
                      disabled={puzzle_list_q.isLoading}
                      onClick={() => {
                        if (puzzleId === puzzle.id) setPuzzleId(undefined);
                        else setPuzzleId(puzzle.id);
                      }}
                    >
                      {puzzle.title}
                    </button>
                  ))
                ) : (
                  <div className="flex items-center justify-center">
                    {!puzzle_list_q.isFetching ? (
                      <p className="text-sm text-gray-500">No puzzles found</p>
                    ) : (
                      <p className="text-sm text-gray-500">Loading...</p>
                    )}
                  </div>
                )}
              </div>
              {puzzle_list.length > 0 && moreItemsToFetch && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleLoadMore}
                    disabled={puzzle_list_q.isFetching}
                    variant="secondary"
                  >
                    {puzzle_list_q.isFetching ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              className="w-40 gap-1 font-bold text-amber-500"
              variant="outline"
              disabled={
                add_schedule_mut.isPending || update_schedule_mut.isPending || invalid_state_condition
              }
            />
          }
        >
          <PlusIcon className="-mt-1 inline-block size-5" />
          {type === 'add'
            ? add_schedule_mut.isPending
              ? 'Adding...'
              : 'Add Schedule'
            : update_schedule_mut.isPending
              ? 'Updating...'
              : 'Update Schedule'}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {type === 'add' ? 'Add Schedule' : 'Update Schedule'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {type === 'add'
                ? 'Are you sure you want to add this schedule?'
                : 'Are you sure you want to update this schedule?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (type === 'add') {
                  handle_add_schedule();
                } else {
                  handle_update_schedule();
                }
              }}
              className="bg-amber-600 font-bold text-white dark:bg-amber-600"
            >
              {type === 'add' ? 'Add Schedule' : 'Update Schedule'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddSchedule;

interface DatePickerProps {
  date: Date | undefined;
  onChangeDate: (date: Date | undefined) => void;
  label: string;
  id?: string;
  start_end_time: string;
  type: 'start' | 'end';
  disabled?: boolean;
  disable_before?: Date;
}

const ISTDateTimePicker: React.FC<DatePickerProps> = ({
  date,
  onChangeDate,
  label,
  start_end_time,
  type,
  disabled,
  disable_before
}) => {
  const [open, setOpen] = useState(false);
  const [internalDate, setInternalDate] = useState<Date | undefined>(date);

  useEffect(() => {
    if (!internalDate) return;
    const selectedDate = internalDate.getDate();
    const year = internalDate.getFullYear();
    const month = internalDate.getMonth();
    const [hours, minutes] = start_end_time.split(':').map(Number);

    // making the IST date string manually to prevent any timezone issues
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    const timeStr =
      `${String(hours || 0).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}:` +
      (type === 'start' ? '01' : '00');
    // the starting part is delayed 1 second to differentiate
    const istDateString = `${dateStr}T${timeStr}+05:30`;

    const dateInIST = new Date(istDateString);
    onChangeDate(dateInIST);
  }, [internalDate, start_end_time]);

  return (
    <div className="flex flex-col gap-3">
      <Label className="px-1">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="w-32 justify-between font-normal"
              disabled={disabled}
            />
          }
        >
          {internalDate
            ? internalDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })
            : 'Select date'}
          <ChevronDownIcon />
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={internalDate}
            captionLayout="dropdown"
            onSelect={(_date) => {
              setInternalDate(_date);
              setOpen(false);
            }}
            disabled={(date) => {
              if (disable_before) {
                let disable_before_date = new Date(disable_before);
                disable_before_date.setHours(0, 0, 0, 0);
                if (date < disable_before_date) return true;
              }
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today;
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

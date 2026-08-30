'use client';

import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { ChevronDownIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { client, useTRPC } from '~/api/client';
import { toast } from 'sonner';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import { LanguageIcon } from '~/components/icons';
import { Switch } from '~/components/ui/switch';
import Icon from '~/tools/Icon';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';

export const DEFAULT_START_END_TIME = '21:00';
const PUZZLE_FETCH_LIMIT = 10;

function getVisiblePages(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]!);
  }

  return result;
}

function scheduleStateInvalid(
  type: 'add' | 'edit',
  hasPuzzle: boolean,
  startDate?: Date,
  endDate?: Date
): boolean {
  return (type === 'add' && !hasPuzzle) || !startDate || !endDate || startDate >= endDate;
}

const fetchPuzzleListPage = async (page: number, search_title: string) =>
  client.puzzle.get_puzzle_list_page.query({
    page,
    size: PUZZLE_FETCH_LIMIT,
    search_title: search_title !== '' ? search_title : undefined,
    sort_by: 'created_at'
  });

function usePuzzleListQuery(page: number, search_title: string, enabled: boolean) {
  const puzzle_list_q = useQuery({
    queryKey: ['puzzle_list_schedule', page, search_title],
    queryFn: () => fetchPuzzleListPage(page, search_title),
    enabled,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false
  });

  return {
    puzzle_list: puzzle_list_q.data?.list ?? [],
    pageCount: puzzle_list_q.data?.pageCount ?? 1,
    hasPrev: puzzle_list_q.data?.hasPrev ?? false,
    hasNext: puzzle_list_q.data?.hasNext ?? false,
    isInitialLoading: puzzle_list_q.isLoading && !puzzle_list_q.data,
    isFetching: puzzle_list_q.isFetching,
    total: puzzle_list_q.data?.total
  };
}

const DEBOUNCE_TIME = 400;

/** Debounced mirror of the search box; settles paging + selection back to defaults. */
function usePuzzleSearchPager(search_title: string) {
  const [debouncedSearchTitle, setDebouncedSearchTitle] = useState(search_title);
  const [page, setPage] = useState(1);
  const [selectedPuzzle, setSelectedPuzzle] = useState<{ id: number; title: string } | undefined>(
    undefined
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTitle(search_title);
      setPage(1);
      setSelectedPuzzle(undefined);
    }, DEBOUNCE_TIME);
    return () => clearTimeout(timeoutId);
  }, [search_title]);

  return { debouncedSearchTitle, page, setPage, selectedPuzzle, setSelectedPuzzle };
}

function useScheduleMutations() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const router = useRouter();
  const navigate = useNavigate();

  const add_schedule_mut = useMutation(
    trpc.schedules.add_puzzle_schedule.mutationOptions({
      onSuccess: async (data) => {
        if (data.success) {
          toast.success('Schedule added successfully');
          void queryClient.invalidateQueries({ queryKey: ['listed_puzzles_carousel'] });
          await router.invalidate();
          navigate({ href: `/padavali/schedules` });
        } else if (data.error_code === 'already_exists_in_time_range') {
          toast.error('A schedule already exists in the time range');
        }
      },
      onError() {
        toast.error('Failed to add schedule');
      }
    })
  );

  const update_schedule_mut = useMutation(
    trpc.schedules.update_puzzle_schedule.mutationOptions({
      onSuccess: async (data) => {
        if (data.success) {
          toast.success('Schedule updated successfully');
          void queryClient.invalidateQueries({ queryKey: ['listed_puzzles_carousel'] });
          await router.invalidate();
          navigate({ href: `/padavali/schedules` });
        }
      },
      onError() {
        toast.error('Failed to update schedule');
      }
    })
  );

  return { add_schedule_mut, update_schedule_mut };
}

const ScheduleDateSummary = ({ startDate, endDate }: { startDate?: Date; endDate?: Date }) => {
  if (!startDate || !endDate) return null;
  return (
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
  );
};

const PuzzleOptionButton = ({
  puzzle,
  selected,
  disabled,
  onToggle
}: {
  puzzle: { id: number; title: string };
  selected: boolean;
  disabled: boolean;
  onToggle: (puzzle: { id: number; title: string }) => void;
}) => (
  <button
    className={cn(
      'rounded-md border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 ease-in-out outline-none',
      'hover:shadow-md focus:ring-2 focus:ring-blue-500/50',
      selected
        ? 'border-blue-400 bg-blue-100 text-blue-900 shadow-md dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-100'
        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:bg-blue-900/20'
    )}
    disabled={disabled}
    onClick={() => onToggle(puzzle)}
  >
    {puzzle.title}
  </button>
);

const PuzzlePagination = ({
  page,
  pageCount,
  hasPrev,
  hasNext,
  isFetching,
  total,
  onPageChange
}: {
  page: number;
  pageCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  isFetching: boolean;
  total?: number;
  onPageChange: (page: number) => void;
}) => {
  if (!(pageCount > 1 || total)) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Prev"
            onClick={(e) => {
              e.preventDefault();
              if (hasPrev && !isFetching) onPageChange(page - 1);
            }}
            aria-disabled={!hasPrev || isFetching}
            className={cn(!hasPrev || isFetching ? 'pointer-events-none opacity-50' : undefined)}
          />
        </PaginationItem>
        {getVisiblePages(page, pageCount).map((pageNumber, index) =>
          pageNumber === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                href="#"
                isActive={pageNumber === page}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isFetching) onPageChange(pageNumber);
                }}
                aria-disabled={isFetching}
                className={cn(isFetching ? 'pointer-events-none opacity-50' : undefined)}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (hasNext && !isFetching) onPageChange(page + 1);
            }}
            aria-disabled={!hasNext || isFetching}
            className={cn(!hasNext || isFetching ? 'pointer-events-none opacity-50' : undefined)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

const PuzzleSelectSection = ({
  search_title,
  onSearchChange,
  ctx,
  lipi_lekhika_typing,
  onToggleTyping,
  puzzle_list,
  selectedPuzzle,
  onTogglePuzzle,
  isInitialLoading,
  isFetching,
  page,
  pageCount,
  hasPrev,
  hasNext,
  total,
  onPageChange
}: {
  search_title: string;
  onSearchChange: (value: string) => void;
  ctx: ReturnType<typeof createTypingContext>;
  lipi_lekhika_typing: boolean;
  onToggleTyping: (checked: boolean) => void;
  puzzle_list: { id: number; title: string }[];
  selectedPuzzle: { id: number; title: string } | undefined;
  onTogglePuzzle: (puzzle: { id: number; title: string }) => void;
  isInitialLoading: boolean;
  isFetching: boolean;
  page: number;
  pageCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  total?: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex flex-col gap-3">
    <div className="px-1 text-lg font-bold">Select Puzzle</div>
    <div className="flex flex-col gap-3">
      <Label className="px-1 font-semibold">Search Puzzle</Label>
      <div className="flex items-center gap-4">
        <SearchIcon className="size-5 text-muted-foreground" />
        <Input
          value={search_title}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          onBeforeInput={(e) =>
            handleTypingBeforeInputEvent(ctx, e, onSearchChange, lipi_lekhika_typing)
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
              onCheckedChange={onToggleTyping}
              className="-mt-1"
            />
            <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
            <span className="text-base font-bold">देवनागरी</span>
          </Label>
        </div>
      </div>
    </div>
    {isInitialLoading && <Skeleton className="h-52 w-full" />}
    {!isInitialLoading && (
      <div className="space-y-3">
        {selectedPuzzle && (
          <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
            <span className="size-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden />
            Selected: <span className="font-medium text-foreground">{selectedPuzzle.title}</span>
          </p>
        )}
        <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-scroll rounded-md border border-gray-200 bg-gray-50/50 p-3 sm:grid-cols-3 lg:grid-cols-4 dark:border-gray-700 dark:bg-gray-800/50">
          {puzzle_list.length > 0 ? (
            puzzle_list.map((puzzle) => (
              <PuzzleOptionButton
                key={puzzle.id}
                puzzle={puzzle}
                selected={selectedPuzzle?.id === puzzle.id}
                disabled={isFetching}
                onToggle={onTogglePuzzle}
              />
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center py-6">
              {!isFetching ? (
                <p className="text-sm text-gray-500">No puzzles found</p>
              ) : (
                <p className="text-sm text-gray-500">Loading...</p>
              )}
            </div>
          )}
        </div>
        <PuzzlePagination
          page={page}
          pageCount={pageCount}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isFetching={isFetching}
          total={total}
          onPageChange={onPageChange}
        />
      </div>
    )}
  </div>
);

const ScheduleConfirmDialog = ({
  type,
  disabled,
  addPending,
  updatePending,
  onConfirm
}: {
  type: 'add' | 'edit';
  disabled: boolean;
  addPending: boolean;
  updatePending: boolean;
  onConfirm: () => void;
}) => (
  <AlertDialog>
    <AlertDialogTrigger
      render={
        <Button
          className="w-40 gap-1 font-bold text-amber-500"
          variant="outline"
          disabled={disabled}
        />
      }
    >
      <PlusIcon className="-mt-1 inline-block size-5" />
      {type === 'add'
        ? addPending
          ? 'Adding...'
          : 'Add Schedule'
        : updatePending
          ? 'Updating...'
          : 'Update Schedule'}
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{type === 'add' ? 'Add Schedule' : 'Update Schedule'}</AlertDialogTitle>
        <AlertDialogDescription>
          {type === 'add'
            ? 'Are you sure you want to add this schedule?'
            : 'Are you sure you want to update this schedule?'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-amber-600 font-bold text-white dark:bg-amber-600"
        >
          {type === 'add' ? 'Add Schedule' : 'Update Schedule'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

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
  const init =
    type === 'edit'
      ? props.init
      : {
          start_date: undefined,
          end_date: undefined,
          start_time_string: DEFAULT_START_END_TIME,
          end_time_string: DEFAULT_START_END_TIME
        };
  const [startDate, setStartDate] = useState<Date | undefined>(init.start_date);
  const [endDate, setEndDate] = useState<Date | undefined>(init.end_date);
  const [startTime, setStartTime] = useState<string>(init.start_time_string + ':00');
  const [endTime, setEndTime] = useState<string>(init.end_time_string + ':00');

  const [search_title, setSearchTitle] = useState('');
  const [lipi_lekhika_typing, setLipiLekhikaTyping] = useState(true);
  const { debouncedSearchTitle, page, setPage, selectedPuzzle, setSelectedPuzzle } =
    usePuzzleSearchPager(search_title);

  const { add_schedule_mut, update_schedule_mut } = useScheduleMutations();

  const invalid_state_condition = scheduleStateInvalid(
    type,
    selectedPuzzle !== undefined,
    startDate,
    endDate
  );

  function handle_confirm() {
    if (invalid_state_condition) {
      toast.error('Please fill all the fields correctly');
      return;
    }
    if (type === 'add') {
      if (!selectedPuzzle) {
        toast.error('Please fill all the fields correctly');
        return;
      }
      add_schedule_mut.mutate({
        puzzle_id: selectedPuzzle.id,
        start_time: startDate,
        end_time: endDate
      });
      return;
    }
    update_schedule_mut.mutate({
      schedule_id: props.schedule_id,
      puzzle_id: props.puzzle_id,
      start_time: startDate,
      end_time: endDate
    });
  }

  const { puzzle_list, pageCount, hasPrev, hasNext, isInitialLoading, isFetching, total } =
    usePuzzleListQuery(page, debouncedSearchTitle, type === 'add');

  function handle_toggle_puzzle(puzzle: { id: number; title: string }) {
    if (selectedPuzzle?.id === puzzle.id) {
      setSelectedPuzzle(undefined);
    } else {
      setSelectedPuzzle(puzzle);
    }
  }

  const ctx = createTypingContext('Devanagari');
  useEffect(() => {
    void ctx.ready;
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
        <ScheduleDateSummary startDate={startDate} endDate={endDate} />
      </div>
      {type === 'add' && (
        <PuzzleSelectSection
          search_title={search_title}
          onSearchChange={setSearchTitle}
          ctx={ctx}
          lipi_lekhika_typing={lipi_lekhika_typing}
          onToggleTyping={setLipiLekhikaTyping}
          puzzle_list={puzzle_list}
          selectedPuzzle={selectedPuzzle}
          onTogglePuzzle={handle_toggle_puzzle}
          isInitialLoading={isInitialLoading}
          isFetching={isFetching}
          page={page}
          pageCount={pageCount}
          hasPrev={hasPrev}
          hasNext={hasNext}
          total={total}
          onPageChange={setPage}
        />
      )}
      <ScheduleConfirmDialog
        type={type}
        disabled={
          add_schedule_mut.isPending || update_schedule_mut.isPending || invalid_state_condition
        }
        addPending={add_schedule_mut.isPending}
        updatePending={update_schedule_mut.isPending}
        onConfirm={handle_confirm}
      />
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
  }, [internalDate, start_end_time, onChangeDate, type]);

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
                const disable_before_date = new Date(disable_before);
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

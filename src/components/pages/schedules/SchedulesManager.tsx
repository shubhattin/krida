'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import {
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon
} from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
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
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { cn } from '~/lib/utils';
import { GAME_KINDS, type GameKind } from '~/util/catalog/tags';
import { gameKindLabel } from '~/util/games/labels';

dayjs.extend(relativeTime);

const KIND_CHIP: Record<GameKind, string> = {
  padavali: 'data-[on=true]:bg-sky-600 data-[on=true]:text-white',
  crossword: 'data-[on=true]:bg-amber-600 data-[on=true]:text-white',
  dvayi: 'data-[on=true]:bg-violet-600 data-[on=true]:text-white',
  bhramita: 'data-[on=true]:bg-emerald-600 data-[on=true]:text-white',
  surupa: 'data-[on=true]:bg-rose-600 data-[on=true]:text-white',
  anveshi: 'data-[on=true]:bg-indigo-600 data-[on=true]:text-white'
};

const KIND_BADGE: Record<GameKind, string> = {
  padavali: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  crossword: 'bg-amber-500/15 text-amber-900 dark:text-amber-100',
  dvayi: 'bg-violet-500/15 text-violet-800 dark:text-violet-200',
  bhramita: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  surupa: 'bg-rose-500/15 text-rose-800 dark:text-rose-200',
  anveshi: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-200'
};

type ScheduleRow = {
  id: number;
  puzzle_id: number;
  kind: GameKind;
  title: string;
  slug: string;
  start_time: Date;
  end_time: Date;
  created_at: Date;
};

type PuzzleHit = {
  id: number;
  game: GameKind;
  title: string;
  slug: string;
};

function toggleKind(selected: GameKind[], kind: GameKind): GameKind[] {
  if (selected.length === 0) return [kind];
  if (selected.includes(kind)) {
    const next = selected.filter((item) => item !== kind);
    return next.length === GAME_KINDS.length ? [] : next;
  }
  const next = [...selected, kind];
  return next.length === GAME_KINDS.length ? [] : next;
}

function istStamp(day: string, time: string) {
  return new Date(`${day}T${time}:00+05:30`);
}

function istParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(value);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    day: `${pick('year')}-${pick('month')}-${pick('day')}`,
    time: `${pick('hour')}:${pick('minute')}`
  };
}

function formatRange(start: Date, end: Date) {
  const startLabel = start.toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  const endLabel = end.toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  return `${startLabel} – ${endLabel} IST`;
}

function KindChips({
  selected,
  onChange
}: {
  selected: GameKind[];
  onChange: (next: GameKind[]) => void;
}) {
  const allOn = selected.length === 0;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Puzzle types">
      <button
        type="button"
        data-on={allOn}
        className="rounded-full border border-border bg-background px-3 py-1 text-sm font-medium transition data-[on=true]:border-foreground data-[on=true]:bg-foreground data-[on=true]:text-background"
        onClick={() => onChange([])}
      >
        All
      </button>
      {GAME_KINDS.map((kind) => {
        const on = allOn || selected.includes(kind);
        return (
          <button
            key={kind}
            type="button"
            data-on={on && !allOn}
            className={cn(
              'rounded-full border border-border bg-background px-3 py-1 text-sm font-medium transition hover:bg-muted',
              KIND_CHIP[kind]
            )}
            onClick={() => onChange(toggleKind(selected, kind))}
          >
            {gameKindLabel(kind)}
          </button>
        );
      })}
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
  label
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  const [lipi, setLipi] = useState(false);
  const typing = useMemo(() => createTypingContext('Devanagari'), []);

  useEffect(() => {
    void typing.ready;
  }, [typing]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          aria-label={label}
          placeholder={placeholder}
          className="pl-9"
          onChange={(event) => onChange(event.target.value)}
          onBeforeInput={(event) =>
            handleTypingBeforeInputEvent(typing, event, (next) => onChange(next), lipi)
          }
          onKeyDown={(event) => {
            if (
              event.altKey &&
              (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
            ) {
              event.preventDefault();
              setLipi((prev) => !prev);
              return;
            }
            clearTypingContextOnKeyDown(event, typing);
          }}
          onBlur={() => typing.clearContext()}
        />
      </div>
      <Label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Icon src={LanguageIcon} className="size-3.5" />
        <Switch checked={lipi} onCheckedChange={setLipi} aria-label="Lipi Lekhika" />
      </Label>
    </div>
  );
}

export function SchedulesManager() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [kinds, setKinds] = useState<GameKind[]>([]);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const [editor, setEditor] = useState<ScheduleRow | 'new' | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 280);
    return () => clearTimeout(timer);
  }, [query]);

  const list = useQuery(
    trpc.schedules.list_schedules.queryOptions({
      kinds,
      query: debounced,
      when
    })
  );

  const remove = useMutation(
    trpc.schedules.delete_puzzle_schedule.mutationOptions({
      onSuccess: async () => {
        toast.success('Schedule deleted');
        await queryClient.invalidateQueries(trpc.schedules.list_schedules.queryFilter());
      },
      onError: () => toast.error('Could not delete that schedule')
    })
  );

  const rows = (list.data ?? []) as ScheduleRow[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/70 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchField
            value={query}
            onChange={setQuery}
            label="Search schedules"
            placeholder="Search by title or slug"
          />
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex rounded-full border border-border bg-background p-0.5">
              {(['upcoming', 'past'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium capitalize transition',
                    when === option ? 'bg-foreground text-background' : 'text-muted-foreground'
                  )}
                  onClick={() => setWhen(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <Button type="button" className="gap-1.5" onClick={() => setEditor('new')}>
              <PlusIcon className="size-4" />
              Schedule
            </Button>
          </div>
        </div>
        <KindChips selected={kinds} onChange={setKinds} />
      </div>

      {list.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted/70" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <CalendarIcon className="size-8 text-muted-foreground" />
          <p className="text-base font-semibold">No {when} schedules</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try another puzzle type, or schedule one. The public home page still shows only the
            current Padavali and crossword slots.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((schedule) => (
            <article
              key={schedule.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Badge className={cn('border-0', KIND_BADGE[schedule.kind])}>
                    {gameKindLabel(schedule.kind)}
                  </Badge>
                  <h2 className="mt-2 truncate text-base font-semibold">{schedule.title}</h2>
                  <p className="truncate text-xs text-muted-foreground">{schedule.slug}</p>
                </div>
                {when === 'upcoming' ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Edit schedule"
                      onClick={() => setEditor(schedule)}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Delete schedule"
                          />
                        }
                      >
                        <Trash2Icon className="size-4 text-rose-500" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {schedule.title} will no longer be queued for{' '}
                            {gameKindLabel(schedule.kind)}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => remove.mutate({ schedule_id: schedule.id })}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatRange(schedule.start_time, schedule.end_time)}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClockIcon className="size-3.5" />
                Added {dayjs(schedule.created_at).fromNow()}
              </p>
            </article>
          ))}
        </div>
      )}

      <ScheduleDialog
        open={editor != null}
        schedule={editor === 'new' ? null : editor}
        kinds={kinds}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      />
    </div>
  );
}

function ScheduleDialog({
  open,
  schedule,
  kinds,
  onOpenChange
}: {
  open: boolean;
  schedule: ScheduleRow | null;
  kinds: GameKind[];
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [pickerKinds, setPickerKinds] = useState<GameKind[]>(kinds);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [puzzle, setPuzzle] = useState<PuzzleHit | null>(null);
  const initial = schedule ? istParts(schedule.start_time) : null;
  const initialEnd = schedule ? istParts(schedule.end_time) : null;
  const [startDay, setStartDay] = useState(initial?.day ?? '');
  const [startTime, setStartTime] = useState(initial?.time ?? '21:00');
  const [endDay, setEndDay] = useState(initialEnd?.day ?? '');
  const [endTime, setEndTime] = useState(initialEnd?.time ?? '21:00');

  useEffect(() => {
    if (!open) return;
    setPickerKinds(kinds);
    setSearch('');
    setDebounced('');
    if (schedule) {
      const start = istParts(schedule.start_time);
      const end = istParts(schedule.end_time);
      setPuzzle({
        id: schedule.puzzle_id,
        game: schedule.kind,
        title: schedule.title,
        slug: schedule.slug
      });
      setStartDay(start.day);
      setStartTime(start.time);
      setEndDay(end.day);
      setEndTime(end.time);
    } else {
      setPuzzle(null);
      const start = istParts(new Date());
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = istParts(tomorrow);
      setStartDay(start.day);
      setStartTime('21:00');
      setEndDay(end.day);
      setEndTime('21:00');
    }
  }, [open, schedule, kinds]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 280);
    return () => clearTimeout(timer);
  }, [search]);

  const hits = useQuery(
    trpc.catalog.search_puzzles.queryOptions(
      {
        query: debounced,
        kinds: pickerKinds.length > 0 ? pickerKinds : [...GAME_KINDS],
        limit: 12
      },
      { enabled: open && schedule == null }
    )
  );

  const add = useMutation(
    trpc.schedules.add_puzzle_schedule.mutationOptions({
      onSuccess: async (data) => {
        if (!data.success) {
          toast.error('Another schedule for this game already covers that time');
          return;
        }
        toast.success('Schedule added');
        await queryClient.invalidateQueries(trpc.schedules.list_schedules.queryFilter());
        onOpenChange(false);
      },
      onError: () => toast.error('Could not add the schedule')
    })
  );
  const update = useMutation(
    trpc.schedules.update_puzzle_schedule.mutationOptions({
      onSuccess: async (data) => {
        if (!data.success) {
          toast.error('Another schedule for this game already covers that time');
          return;
        }
        toast.success('Schedule updated');
        await queryClient.invalidateQueries(trpc.schedules.list_schedules.queryFilter());
        onOpenChange(false);
      },
      onError: () => toast.error('Could not update the schedule')
    })
  );

  const save = () => {
    if (!puzzle || !startDay || !endDay) return;
    const start_time = istStamp(startDay, startTime);
    const end_time = istStamp(endDay, endTime);
    if (!(start_time < end_time)) {
      toast.error('Start time has to be before the end');
      return;
    }
    if (schedule) {
      update.mutate({ schedule_id: schedule.id, puzzle_id: puzzle.id, start_time, end_time });
    } else {
      add.mutate({ puzzle_id: puzzle.id, start_time, end_time });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{schedule ? 'Edit schedule' : 'Schedule a puzzle'}</DialogTitle>
          <DialogDescription>
            Times are India Standard Time. Overlap is checked per puzzle type, so Padavali and
            crossword can run in the same window.
          </DialogDescription>
        </DialogHeader>

        {schedule ? (
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
            <Badge className={cn('border-0', KIND_BADGE[puzzle?.game ?? schedule.kind])}>
              {gameKindLabel(puzzle?.game ?? schedule.kind)}
            </Badge>
            <p className="mt-1 font-medium">{puzzle?.title}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <KindChips selected={pickerKinds} onChange={setPickerKinds} />
            <SearchField
              value={search}
              onChange={setSearch}
              label="Search puzzles to schedule"
              placeholder="Find a puzzle"
            />
            <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
              {(hits.data ?? []).map((hit) => {
                const selected = puzzle?.id === hit.id;
                return (
                  <button
                    key={`${hit.game}-${hit.id}`}
                    type="button"
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition',
                      selected
                        ? 'border-foreground bg-muted'
                        : 'border-transparent hover:bg-muted/70'
                    )}
                    onClick={() =>
                      setPuzzle({
                        id: hit.id,
                        game: hit.game,
                        title: hit.title,
                        slug: hit.slug
                      })
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{hit.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {hit.slug}
                      </span>
                    </span>
                    <Badge className={cn('shrink-0 border-0', KIND_BADGE[hit.game])}>
                      {gameKindLabel(hit.game)}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Starts
            <Input
              type="date"
              value={startDay}
              onChange={(event) => setStartDay(event.target.value)}
            />
            <Input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Ends
            <Input type="date" value={endDay} onChange={(event) => setEndDay(event.target.value)} />
            <Input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!puzzle || add.isPending || update.isPending}
            onClick={save}
          >
            {schedule ? 'Save' : 'Add schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

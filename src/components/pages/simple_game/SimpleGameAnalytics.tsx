'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import pretty_ms from 'pretty-ms';
import {
  CheckCircle2Icon,
  ClockIcon,
  CrosshairIcon,
  PlayIcon,
  TrendingUpIcon
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useTRPC } from '~/api/client';
import { client } from '~/api/client';
import {
  AnalyticsCustomRangePicker,
  AnalyticsPeriodSelect
} from '~/components/analytics/AnalyticsPeriodFilter';
import { useAnalyticsPeriod } from '~/components/analytics/analytics_period';
import {
  AnalyticsStatCardsSkeleton,
  AnalyticsStatGrid,
  type AnalyticsStat
} from '~/components/analytics/AnalyticsStatCards';
import { TopPlayedLeader } from '~/components/analytics/TopPlayedLeader';
import { UserSelector, type SelectedUser } from '~/components/analytics/UserSelector';
import { Card } from '~/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '~/components/ui/chart';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import { SIMPLE_GAME_META, type SimpleGameKind } from '~/util/games/kinds';

type AnalyticsGame = 'padavali' | 'padajala' | SimpleGameKind;
type DatedRow = { created_at: Date | string };
type DailyPoint = { date: string; started: number; completed: number; label: string };

const EMPTY_DATED_ROWS: DatedRow[] = [];

function analyticsUserGame(kind: SimpleGameKind): AnalyticsGame {
  return kind;
}

function dailyPlaySeries(sessions: DatedRow[], stats: DatedRow[]): DailyPoint[] {
  const map = new Map<string, { date: string; started: number; completed: number }>();
  for (const session of sessions) {
    const date = format(new Date(session.created_at), 'yyyy-MM-dd');
    const row = map.get(date) ?? { date, started: 0, completed: 0 };
    row.started += 1;
    map.set(date, row);
  }
  for (const stat of stats) {
    const date = format(new Date(stat.created_at), 'yyyy-MM-dd');
    const row = map.get(date) ?? { date, started: 0, completed: 0 };
    row.completed += 1;
    map.set(date, row);
  }
  return [...map.values()].toSorted((a, b) => a.date.localeCompare(b.date)).map((row) => ({
    ...row,
    label: format(parseISO(row.date), 'MMM dd')
  }));
}

function simpleGameStatCards(
  started: number,
  completed: number,
  avgTime: number,
  avgAccuracy: number
): AnalyticsStat[] {
  return [
    {
      label: 'Started',
      value: started.toLocaleString(),
      hint: 'Play sessions',
      icon: PlayIcon,
      accent: 'sky'
    },
    {
      label: 'Completed',
      value: completed.toLocaleString(),
      hint: 'Finished games',
      icon: CheckCircle2Icon,
      accent: 'emerald'
    },
    {
      label: 'Completion',
      value: `${started > 0 ? Math.round((completed / started) * 100) : 0}%`,
      hint: 'Finished / started',
      icon: TrendingUpIcon,
      accent: 'violet'
    },
    {
      label: 'Avg time',
      value: avgTime > 0 ? pretty_ms(avgTime * 1000, { compact: true }) : '—',
      hint: 'Per completed play',
      icon: ClockIcon,
      accent: 'amber'
    },
    {
      label: 'Avg accuracy',
      value: `${avgAccuracy}%`,
      hint: 'Correct / attempts',
      icon: CrosshairIcon,
      accent: 'fuchsia'
    }
  ];
}

function SimpleGameDailyChart({
  isLoading,
  daily
}: {
  isLoading: boolean;
  daily: DailyPoint[];
}) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (daily.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">No plays in this period.</p>
    );
  }
  return (
    <ChartContainer
      className="h-64 w-full"
      config={{
        started: { label: 'Started', color: 'hsl(var(--chart-1))' },
        completed: { label: 'Completed', color: 'hsl(var(--chart-2))' }
      }}
    >
      <AreaChart data={daily}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="started"
          stroke="var(--color-started)"
          fill="var(--color-started)"
          fillOpacity={0.18}
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="var(--color-completed)"
          fill="var(--color-completed)"
          fillOpacity={0.28}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function SimpleGameAnalytics({
  kind,
  lockedPuzzleId
}: {
  kind: SimpleGameKind;
  lockedPuzzleId?: number;
}) {
  const trpc = useTRPC();
  const meta = SIMPLE_GAME_META[kind];
  const period = useAnalyticsPeriod('last_month');
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [puzzleId, setPuzzleId] = useState<number | 'all'>(lockedPuzzleId ?? 'all');

  const rangeInput = {
    all_time: period.allTime,
    start_date: period.effectiveRange?.from,
    end_date: period.effectiveRange?.to
  };

  const puzzlesQuery = useQuery({
    queryKey: [`${kind}_analytics_puzzles`],
    queryFn: () =>
      client[kind].get_puzzle_list_page.query({
        page: 1,
        size: 50,
        sort_by: 'created_at',
        order_by: 'desc'
      })
  });

  const statsQuery = useQuery(
    trpc[kind].stats.get_stats_data.queryOptions(
      {
        ...rangeInput,
        puzzle_ids: puzzleId === 'all' ? undefined : [puzzleId],
        user_ids: selectedUsers.length > 0 ? selectedUsers.map((user) => user.id) : undefined
      },
      { enabled: period.isReady }
    )
  );

  const topQuery = useQuery(
    trpc[kind].stats.get_top_puzzles.queryOptions(
      { ...rangeInput, limit: 10 },
      { enabled: period.isReady }
    )
  );

  const sessions = statsQuery.data?.sessions ?? EMPTY_DATED_ROWS;
  const stats = statsQuery.data?.stats ?? EMPTY_DATED_ROWS;
  const completed = stats.length;
  const started = sessions.length;
  const avgTime =
    completed > 0 ? Math.round(stats.reduce((sum, row) => sum + row.time_taken, 0) / completed) : 0;
  const avgAccuracy =
    completed > 0
      ? Math.round(stats.reduce((sum, row) => sum + row.accuracy, 0) / completed)
      : 0;
  const cards = simpleGameStatCards(started, completed, avgTime, avgAccuracy);
  const daily = useMemo(() => dailyPlaySeries(sessions, stats), [sessions, stats]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{meta.name} analytics</h1>
        <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          {lockedPuzzleId == null ? (
          <div className="space-y-1">
            <Label>Puzzle</Label>
            <Select
              value={puzzleId === 'all' ? 'all' : String(puzzleId)}
              onValueChange={(value) => setPuzzleId(value === 'all' ? 'all' : Number(value))}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All puzzles</SelectItem>
                {(puzzlesQuery.data?.list ?? []).map((puzzle) => (
                  <SelectItem key={puzzle.id} value={String(puzzle.id)}>
                    {puzzle.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          ) : null}
          <UserSelector
            game={analyticsUserGame(kind)}
            selectedUsers={selectedUsers}
            onSelectedUsersChange={setSelectedUsers}
          />
        </div>
        <AnalyticsPeriodSelect period={period.period} onPeriodChange={period.setPeriod} />
      </div>
      {period.period === 'custom' ? (
        <AnalyticsCustomRangePicker
          dateRange={period.dateRange}
          onDateRangeChange={period.setDateRange}
        />
      ) : null}
      {statsQuery.isLoading ? (
        <AnalyticsStatCardsSkeleton />
      ) : (
        <AnalyticsStatGrid stats={cards} />
      )}
      <Card className="p-4">
        <SimpleGameDailyChart isLoading={statsQuery.isLoading} daily={daily} />
      </Card>
      <TopPlayedLeader
        variant="puzzles"
        accordionValue={`${kind}-top-puzzles`}
        title={`Top played — ${meta.name}`}
        subtitle="Top 10 by plays"
        emptyMessage={`No ${meta.name} plays in this period`}
        isLoading={topQuery.isLoading}
        items={(topQuery.data?.puzzles ?? []).map((puzzle) => ({
          id: String(puzzle.puzzle_id),
          title: puzzle.title,
          started: puzzle.started,
          completed: puzzle.completed
        }))}
      />
    </div>
  );
}

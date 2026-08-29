'use client';

import { useState, useMemo, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
import { Calendar } from '~/components/ui/calendar';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '~/components/ui/chart';
import { XAxis, YAxis, CartesianGrid, AreaChart, Area, BarChart, Bar } from 'recharts';
import {
  CalendarIcon,
  TrendingUpIcon,
  UsersIcon,
  ClockIcon,
  CheckCircle2Icon,
  CrosshairIcon,
  TrophyIcon
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { format, parseISO, subMonths, subWeeks, startOfDay, endOfDay } from 'date-fns';
import pretty_ms from 'pretty-ms';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import PuzzleSelector, { type SelectedPuzzle } from './-PuzzleSelector';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type PeriodType = 'all_time' | 'last_week' | 'last_month' | 'last_3_months' | 'custom';
type GameplayMode = 'all' | 'practice' | 'unguided';
type ChartType =
  | 'sessions-completions'
  | 'avg-time'
  | 'avg-accuracy'
  | 'attempts'
  | 'location'
  | 'script';

const PERIOD_ITEMS = [
  { label: 'All Time', value: 'all_time' as const },
  { label: 'Last Week', value: 'last_week' as const },
  { label: 'Last Month', value: 'last_month' as const },
  { label: 'Last 3 Months', value: 'last_3_months' as const },
  { label: 'Custom Range', value: 'custom' as const }
];

const MAX_CHART_POINTS = 28;

function yearFromDateKey(dateKey: string): number {
  return Number(dateKey.slice(0, 4));
}

function shouldShowYearInTooltip(
  allTime: boolean,
  range: { from: Date; to: Date } | null,
  dateKeys: string[]
): boolean {
  if (allTime) return true;
  if (range && range.from.getFullYear() !== range.to.getFullYear()) return true;
  if (dateKeys.length >= 2) {
    return yearFromDateKey(dateKeys[0]) !== yearFromDateKey(dateKeys[dateKeys.length - 1]);
  }
  return false;
}

function buildDateLabels(
  dateStr: string,
  endDateStr: string | undefined,
  showYearInTooltip: boolean
) {
  const end = endDateStr ?? dateStr;
  const axisFmt = 'MMM dd';
  const tooltipFmt = showYearInTooltip ? 'MMM dd, yyyy' : 'MMM dd';
  const label =
    dateStr === end
      ? format(parseISO(dateStr), axisFmt)
      : `${format(parseISO(dateStr), axisFmt)} – ${format(parseISO(end), axisFmt)}`;
  const tooltipLabel =
    dateStr === end
      ? format(parseISO(dateStr), tooltipFmt)
      : `${format(parseISO(dateStr), tooltipFmt)} – ${format(parseISO(end), tooltipFmt)}`;
  return { label, tooltipLabel, endDate: end };
}

function bucketDailyStats(
  dailyStats: DailyStatPoint[],
  showYearInTooltip: boolean
): DailyStatPoint[] {
  if (dailyStats.length <= MAX_CHART_POINTS) return dailyStats;

  const bucketSize = Math.ceil(dailyStats.length / MAX_CHART_POINTS);
  const buckets: DailyStatPoint[] = [];

  for (let i = 0; i < dailyStats.length; i += bucketSize) {
    const chunk = dailyStats.slice(i, i + bucketSize);
    const sessions = chunk.reduce((sum, d) => sum + d.sessions, 0);
    const completions = chunk.reduce((sum, d) => sum + d.completions, 0);
    const totalTimeTaken = chunk.reduce((sum, d) => sum + d.totalTimeTaken, 0);
    const totalAccuracy = chunk.reduce((sum, d) => sum + d.totalAccuracy, 0);
    const totalTotalAttempts = chunk.reduce((sum, d) => sum + d.totalTotalAttempts, 0);
    const totalCorrectAttempts = chunk.reduce((sum, d) => sum + d.totalCorrectAttempts, 0);
    const { label, tooltipLabel, endDate } = buildDateLabels(
      chunk[0].date,
      chunk[chunk.length - 1].date,
      showYearInTooltip
    );

    buckets.push({
      date: chunk[0].date,
      endDate,
      label,
      tooltipLabel,
      sessions,
      completions,
      totalTimeTaken,
      totalAccuracy,
      totalTotalAttempts,
      totalCorrectAttempts,
      avgTimeTaken: completions > 0 ? Math.round(totalTimeTaken / completions) : 0,
      avgAccuracy: completions > 0 ? Math.round(totalAccuracy / completions) : 0,
      avgTotalAttempts: completions > 0 ? Math.round(totalTotalAttempts / completions) : 0,
      avgCorrectAttempts: completions > 0 ? Math.round(totalCorrectAttempts / completions) : 0
    });
  }

  return buckets;
}

const CHART_TYPE_ITEMS = [
  { label: 'Started and Completed', value: 'sessions-completions' as const },
  { label: 'Average Time', value: 'avg-time' as const },
  { label: 'Average Accuracy', value: 'avg-accuracy' as const },
  { label: 'Total and Correct Attempts', value: 'attempts' as const },
  { label: 'Location', value: 'location' as const },
  { label: 'Script', value: 'script' as const }
];

const GAMEPLAY_MODE_ITEMS = [
  { label: 'All', value: 'all' as const },
  { label: 'Practice', value: 'practice' as const },
  { label: 'No Hint', value: 'unguided' as const }
];

type StatsSession = {
  id: number;
  created_at: Date | string;
  practice_mode: boolean;
  location: string | null;
  script: string | null;
};

type StatsCompletion = {
  id: number;
  created_at: Date | string;
  session_id: number;
  time_taken: number;
  accuracy: number;
  correct_attempts: number;
  total_attempts: number;
};

function filterByGameplayMode(
  sessions: StatsSession[],
  stats: StatsCompletion[],
  mode: GameplayMode
): { sessions: StatsSession[]; stats: StatsCompletion[] } {
  if (mode === 'all') return { sessions, stats };

  const includedSessionIds = new Set(
    sessions
      .filter((session) => (mode === 'practice' ? session.practice_mode : !session.practice_mode))
      .map((session) => session.id)
  );

  return {
    sessions: sessions.filter((session) => includedSessionIds.has(session.id)),
    stats: stats.filter((stat) => includedSessionIds.has(stat.session_id))
  };
}

const DEFAULT_CHART_CONFIG = {
  sessions: {
    label: 'Started',
    color: 'hsl(217 91% 60%)'
  },
  completions: {
    label: 'Completed',
    color: 'hsl(240 100% 70%)'
  },
  avgTimeTaken: {
    label: 'Avg Time (s)',
    color: 'hsl(120 100% 40%)'
  },
  avgAccuracy: {
    label: 'Avg Accuracy (%)',
    color: 'hsl(30 100% 50%)'
  },
  avgTotalAttempts: {
    label: 'Total Attempts',
    color: 'hsl(200 100% 50%)'
  },
  avgCorrectAttempts: {
    label: 'Correct Attempts',
    color: 'hsl(150 100% 40%)'
  },
  frequency: {
    label: 'Frequency',
    color: 'hsl(170 100% 45%)'
  }
};

type ChartDataType = {
  dailyStats: {
    avgTimeTaken: number;
    avgAccuracy: number;
    avgTotalAttempts: number;
    avgCorrectAttempts: number;
    date: string;
    endDate: string;
    label: string;
    tooltipLabel: string;
    sessions: number;
    completions: number;
    totalTimeTaken: number;
    totalAccuracy: number;
    totalTotalAttempts: number;
    totalCorrectAttempts: number;
  }[];
  locationFrequency: {
    name: string;
    frequency: number;
  }[];
  scriptFrequency: {
    name: string;
    frequency: number;
  }[];
  isBucketed: boolean;
};

type DailyStatPoint = ChartDataType['dailyStats'][number];

// Custom tooltip for sessions-completions chart
const SessionsCompletionsTooltip = ({
  active,
  payload
}: {
  active?: boolean;
  payload?: { payload: DailyStatPoint }[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const sessions = data.sessions || 0;
    const completions = data.completions || 0;
    const completionRate = sessions > 0 ? Math.round((completions / sessions) * 100) : 0;

    return (
      <div className="rounded-lg border bg-background p-2 shadow-md">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] text-muted-foreground uppercase">
              {data.tooltipLabel}
            </span>
          </div>
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: 'hsl(210, 100%, 45%)' }}
              />
              <span className="text-sm">Started: {sessions}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: 'hsl(140, 70%, 40%)' }}
              />
              <span className="text-sm">Completed: {completions}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 border-t pt-1">
              <span className="text-sm font-medium">Completion Rate: {completionRate}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Custom tooltip for attempts chart
const AttemptsTooltip = ({
  active,
  payload
}: {
  active?: boolean;
  payload?: { payload: DailyStatPoint }[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const totalAttempts = data.avgTotalAttempts || 0;
    const correctAttempts = data.avgCorrectAttempts || 0;
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    return (
      <div className="rounded-lg border bg-background p-2 shadow-md">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] text-muted-foreground uppercase">
              {data.tooltipLabel}
            </span>
          </div>
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: 'hsl(200 100% 50%)' }}
              />
              <span className="text-sm">Total Attempts: {totalAttempts}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: 'hsl(150 100% 40%)' }}
              />
              <span className="text-sm">Correct Attempts: {correctAttempts}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 border-t pt-1">
              <span className="text-sm font-medium">Accuracy: {accuracy}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Custom tooltip for average time chart
const AvgTimeTooltip = ({
  active,
  payload
}: {
  active?: boolean;
  payload?: { payload: DailyStatPoint }[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const avgTimeTaken = data.avgTimeTaken || 0;

    return (
      <div className="rounded-lg border bg-background p-2 shadow-md">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] text-muted-foreground uppercase">
              {data.tooltipLabel}
            </span>
          </div>
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: 'hsl(120 100% 40%)' }}
              />
              <span className="text-sm">Average Time: {pretty_ms(avgTimeTaken * 1000)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Main component
type PuzzleStatsProps = {
  puzzleId?: number;
  puzzleTitle?: string;
};

const PuzzleStats = ({ puzzleId, puzzleTitle }: PuzzleStatsProps) => {
  const isEmbedded = puzzleId != null;
  const [period, setPeriod] = useState<PeriodType>('last_month');
  const [gameplayMode, setGameplayMode] = useState<GameplayMode>('all');
  const [chartType, setChartType] = useState<ChartType>('sessions-completions');
  const [selectedPuzzles, setSelectedPuzzles] = useState<SelectedPuzzle[]>(() =>
    puzzleId && puzzleTitle ? [{ id: puzzleId, title: puzzleTitle }] : []
  );
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = endOfDay(new Date());
    const monthAgo = startOfDay(subMonths(today, 1));
    return { from: monthAgo, to: today };
  });

  const effectiveDateRange = useMemo(() => {
    const today = endOfDay(new Date());
    if (period === 'all_time') return null;
    if (period === 'last_week') {
      return { from: startOfDay(subWeeks(today, 1)), to: today };
    }
    if (period === 'last_month') {
      return { from: startOfDay(subMonths(today, 1)), to: today };
    }
    if (period === 'last_3_months') {
      return { from: startOfDay(subMonths(today, 3)), to: today };
    }
    return dateRange.from && dateRange.to
      ? { from: startOfDay(dateRange.from), to: endOfDay(dateRange.to) }
      : null;
  }, [period, dateRange]);

  const puzzleIds = selectedPuzzles.length > 0 ? selectedPuzzles.map((p) => p.id) : undefined;
  const allTime = period === 'all_time';

  const statsQueryEnabled = allTime || !!(effectiveDateRange?.from && effectiveDateRange?.to);

  const trpc = useTRPC();

  const statsQuery = useQuery(
    trpc.puzzle.stats.get_stats_data.queryOptions(
      {
        puzzle_ids: puzzleIds,
        all_time: allTime,
        start_date: effectiveDateRange?.from,
        end_date: effectiveDateRange?.to
      },
      {
        enabled: statsQueryEnabled
      }
    )
  );

  const topPuzzlesQuery = useQuery(
    trpc.puzzle.stats.get_top_puzzles.queryOptions(
      {
        all_time: allTime,
        start_date: effectiveDateRange?.from,
        end_date: effectiveDateRange?.to,
        limit: 10
      },
      {
        enabled: !isEmbedded && statsQueryEnabled
      }
    )
  );

  const filteredStatsData = useMemo(() => {
    if (!statsQuery.data) return null;
    const { sessions, stats } = filterByGameplayMode(
      statsQuery.data.sessions,
      statsQuery.data.stats,
      gameplayMode
    );
    return { ...statsQuery.data, sessions, stats };
  }, [statsQuery.data, gameplayMode]);

  // Process data for charts
  const chartData = useMemo(() => {
    if (!filteredStatsData)
      return { dailyStats: [], locationFrequency: [], scriptFrequency: [], isBucketed: false };

    const { sessions, stats } = filteredStatsData;

    // Create daily aggregation
    const dailyMap = new Map<
      string,
      {
        date: string;
        sessions: number;
        completions: number;
        totalTimeTaken: number;
        totalAccuracy: number;
        totalTotalAttempts: number;
        totalCorrectAttempts: number;
        avgTimeTaken: number;
        avgAccuracy: number;
        avgTotalAttempts: number;
        avgCorrectAttempts: number;
      }
    >();

    sessions.forEach((session) => {
      const dateKey = format(new Date(session.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        sessions: 0,
        completions: 0,
        totalTimeTaken: 0,
        totalAccuracy: 0,
        totalTotalAttempts: 0,
        totalCorrectAttempts: 0,
        avgTimeTaken: 0,
        avgAccuracy: 0,
        avgTotalAttempts: 0,
        avgCorrectAttempts: 0
      };
      existing.sessions += 1;
      dailyMap.set(dateKey, existing);
    });

    stats.forEach((stat) => {
      const dateKey = format(new Date(stat.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        sessions: 0,
        completions: 0,
        totalTimeTaken: 0,
        totalAccuracy: 0,
        totalTotalAttempts: 0,
        totalCorrectAttempts: 0,
        avgTimeTaken: 0,
        avgAccuracy: 0,
        avgTotalAttempts: 0,
        avgCorrectAttempts: 0
      };
      existing.completions += 1;
      existing.totalTimeTaken += stat.time_taken;
      existing.totalAccuracy += stat.accuracy;
      existing.totalTotalAttempts += stat.total_attempts;
      existing.totalCorrectAttempts += stat.correct_attempts;
      dailyMap.set(dateKey, existing);
    });

    // Calculate averages for each day
    const dailyStatsRaw = Array.from(dailyMap.values())
      .map((day) => ({
        ...day,
        endDate: day.date,
        label: '',
        tooltipLabel: '',
        avgTimeTaken: day.completions > 0 ? Math.round(day.totalTimeTaken / day.completions) : 0,
        avgAccuracy: day.completions > 0 ? Math.round(day.totalAccuracy / day.completions) : 0,
        avgTotalAttempts:
          day.completions > 0 ? Math.round(day.totalTotalAttempts / day.completions) : 0,
        avgCorrectAttempts:
          day.completions > 0 ? Math.round(day.totalCorrectAttempts / day.completions) : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const showYearInTooltip = shouldShowYearInTooltip(
      allTime,
      effectiveDateRange,
      dailyStatsRaw.map((d) => d.date)
    );

    const dailyStatsLabeled = dailyStatsRaw.map((day) => {
      const { label, tooltipLabel, endDate } = buildDateLabels(
        day.date,
        day.endDate,
        showYearInTooltip
      );
      return { ...day, endDate, label, tooltipLabel };
    });

    const isBucketed = dailyStatsLabeled.length > MAX_CHART_POINTS;
    const dailyStats = bucketDailyStats(dailyStatsLabeled, showYearInTooltip);

    // Calculate location frequency (ignore null values)
    const locationMap = new Map<string, number>();
    sessions.forEach((session) => {
      if (session.location !== null) {
        const count = locationMap.get(session.location) || 0;
        locationMap.set(session.location, count + 1);
      }
    });
    const locationFrequency = Array.from(locationMap.entries())
      .map(([name, frequency]) => ({ name, frequency }))
      .sort((a, b) => b.frequency - a.frequency);

    // Calculate script frequency (use DEFAULT_DATA_SCRIPT for null values)
    const scriptMap = new Map<string, number>();
    sessions.forEach((session) => {
      const script = session.script ?? DEFAULT_DATA_SCRIPT;
      const count = scriptMap.get(script) || 0;
      scriptMap.set(script, count + 1);
    });
    const scriptFrequency = Array.from(scriptMap.entries())
      .map(([name, frequency]) => ({ name, frequency }))
      .sort((a, b) => b.frequency - a.frequency);

    return { dailyStats, locationFrequency, scriptFrequency, isBucketed };
  }, [filteredStatsData, allTime, effectiveDateRange]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!filteredStatsData) return null;

    const { sessions, stats } = filteredStatsData;

    // Calculate averages from completed sessions
    const avgTimeTaken =
      stats.length > 0
        ? Math.round(stats.reduce((sum, stat) => sum + stat.time_taken, 0) / stats.length)
        : 0;

    const avgAccuracy =
      stats.length > 0
        ? Math.round(stats.reduce((sum, stat) => sum + stat.accuracy, 0) / stats.length)
        : 0;

    return {
      totalSessions: sessions.length,
      totalCompletions: stats.length,
      completionRate: sessions.length > 0 ? Math.round((stats.length / sessions.length) * 100) : 0,
      avgTimeTaken,
      avgAccuracy
    };
  }, [filteredStatsData]);

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">Puzzle Statistics</h2>
          <p className="text-sm text-muted-foreground">
            {selectedPuzzles.length === 0
              ? 'Analytics across all puzzles'
              : selectedPuzzles.length === 1
                ? `Analytics for ${selectedPuzzles[0].title}`
                : `Analytics for ${selectedPuzzles.length} selected puzzles`}
          </p>
        </div>
        <StatsFilterControls
          period={period}
          setPeriod={setPeriod}
          gameplayMode={gameplayMode}
          setGameplayMode={setGameplayMode}
        />
      </div>

      <PuzzleSelector
        selectedPuzzles={selectedPuzzles}
        onSelectedPuzzlesChange={setSelectedPuzzles}
        locked={isEmbedded}
      />

      {period === 'custom' && (
        <CustomDateRangeRow dateRange={dateRange} setDateRange={setDateRange} />
      )}
      {statsQuery.isLoading && <StatsLoadingSkeleton />}
      {statsQuery.isError && (
        <div className="py-8 text-center">
          <div className="text-destructive">Failed to load statistics</div>
        </div>
      )}
      {/* Stats Content */}
      {!statsQuery.isLoading && statsQuery.isSuccess && summaryStats && (
        <>
          {!isEmbedded && (
            <TopPuzzlesLeader
              puzzles={topPuzzlesQuery.data?.puzzles ?? []}
              isLoading={topPuzzlesQuery.isLoading}
            />
          )}
          {/* Summary Cards */}
          <SummaryCards summaryStats={summaryStats} />

          {summaryStats.totalSessions === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No data available for the selected time period
            </p>
          ) : (
            <ChartsSection
              chartData={chartData}
              chartConfig={DEFAULT_CHART_CONFIG}
              chartType={chartType}
              setChartType={setChartType}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PuzzleStats;

const STARTED_BAR_COLOR = 'hsl(210, 100%, 45%)';
const COMPLETED_BAR_COLOR = 'hsl(140, 70%, 40%)';

type TopPuzzleRow = {
  puzzle_id: number;
  title: string;
  started: number;
  completed: number;
};

const TopPuzzlesLeader = ({
  puzzles,
  isLoading
}: {
  puzzles: TopPuzzleRow[];
  isLoading: boolean;
}) => {
  const maxStarted = puzzles.reduce((max, p) => Math.max(max, p.started), 0);

  return (
    <Accordion defaultValue={[]} className="w-full">
      <AccordionItem
        value="top-puzzles"
        className="overflow-hidden rounded-xl border border-slate-200/50 bg-linear-to-br from-white/80 to-slate-50/40 dark:border-slate-700/50 dark:from-slate-900/80 dark:to-slate-800/40"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-black/5 ring-inset dark:ring-white/10">
              <TrophyIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold tracking-tight">Top Played Puzzles</p>
              <p className="text-xs font-normal text-muted-foreground">Top 10 by plays</p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : puzzles.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              No puzzle plays in this period
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: STARTED_BAR_COLOR }}
                  />
                  Started
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: COMPLETED_BAR_COLOR }}
                  />
                  Completed
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {puzzles.map((puzzle, index) => {
                  const barWidthPct = maxStarted > 0 ? (puzzle.started / maxStarted) * 100 : 0;
                  const completedPct =
                    puzzle.started > 0
                      ? Math.min(100, (puzzle.completed / puzzle.started) * 100)
                      : 0;

                  return (
                    <div
                      key={puzzle.puzzle_id}
                      className="min-w-0 space-y-1.5 rounded-lg border border-slate-200/40 bg-white/50 px-3 py-2.5 dark:border-slate-700/40 dark:bg-slate-950/30"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium">
                          <span className="mr-1.5 text-muted-foreground tabular-nums">
                            #{index + 1}
                          </span>
                          {puzzle.title}
                        </p>
                        <p className="shrink-0 text-[0.7rem] text-muted-foreground tabular-nums">
                          {puzzle.completed}/{puzzle.started}
                        </p>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="relative h-full overflow-hidden rounded-full transition-[width] duration-300"
                          style={{
                            width: `${barWidthPct}%`,
                            backgroundColor: STARTED_BAR_COLOR
                          }}
                        >
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
                            style={{
                              width: `${completedPct}%`,
                              backgroundColor: COMPLETED_BAR_COLOR
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

// Charts section component
const ChartsSection = ({
  chartData,
  chartConfig,
  chartType,
  setChartType
}: {
  chartData: ChartDataType;
  chartConfig: typeof DEFAULT_CHART_CONFIG;
  chartType: ChartType;
  setChartType: (chartType: ChartType) => void;
}) => (
  <Card className="w-full">
    <CardHeader className="gap-1 px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChartSelector chartType={chartType} setChartType={setChartType} />
        {chartData.isBucketed && (
          <p className="text-xs text-muted-foreground">Grouped for readability</p>
        )}
      </div>
    </CardHeader>
    <CardContent className="w-full p-2 sm:p-3">
      <ChartContainer
        config={chartConfig}
        initialDimension={{ width: 1200, height: 360 }}
        className="aspect-auto h-60 w-full min-w-0 sm:h-72 md:h-80 lg:h-96 [&_.recharts-responsive-container]:w-full! [&_.recharts-surface]:w-full"
      >
        {chartType === 'location' || chartType === 'script' ? (
          <BarChart
            data={
              chartType === 'location' ? chartData.locationFrequency : chartData.scriptFrequency
            }
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
            <XAxis
              dataKey="name"
              className="stroke-muted-foreground"
              tick={{ className: 'fill-muted-foreground', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              className="stroke-muted-foreground"
              tick={{ className: 'fill-muted-foreground', fontSize: 12 }}
              width={48}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="frequency" fill={chartConfig.frequency.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <AreaChart data={chartData.dailyStats} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(210, 100%, 45%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(210, 100%, 45%)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="completionsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(140, 70%, 40%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(140, 70%, 40%)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="avgTimeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(120, 100%, 40%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(120, 100%, 40%)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="avgAccuracyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(30, 100%, 50%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(30, 100%, 50%)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="totalAttemptsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(200, 100%, 50%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(200, 100%, 50%)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="correctAttemptsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(150, 100%, 40%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(150, 100%, 40%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
            <XAxis
              dataKey="label"
              className="stroke-muted-foreground"
              tick={{ className: 'fill-muted-foreground', fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={24}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              className="stroke-muted-foreground"
              tick={{ className: 'fill-muted-foreground', fontSize: 12 }}
              width={48}
              allowDecimals={false}
            />
            <ChartTooltip
              content={
                chartType === 'sessions-completions' ? (
                  <SessionsCompletionsTooltip />
                ) : chartType === 'attempts' ? (
                  <AttemptsTooltip />
                ) : chartType === 'avg-time' ? (
                  <AvgTimeTooltip />
                ) : (
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload as DailyStatPoint | undefined;
                      return point?.tooltipLabel ?? '';
                    }}
                  />
                )
              }
            />
            {chartType === 'sessions-completions' && (
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="hsl(210, 100%, 45%)"
                fill="url(#sessionsFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            )}
            {chartType === 'sessions-completions' && (
              <Area
                type="monotone"
                dataKey="completions"
                stroke="hsl(140, 70%, 40%)"
                fill="url(#completionsFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            )}
            {chartType === 'avg-time' && (
              <Area
                type="monotone"
                dataKey="avgTimeTaken"
                stroke="hsl(120, 100%, 40%)"
                fill="url(#avgTimeFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            )}
            {chartType === 'avg-accuracy' && (
              <Area
                type="monotone"
                dataKey="avgAccuracy"
                stroke="hsl(30, 100%, 50%)"
                fill="url(#avgAccuracyFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            )}
            {chartType === 'attempts' && (
              <Area
                type="monotone"
                dataKey="avgTotalAttempts"
                stroke="hsl(200, 100%, 50%)"
                fill="url(#totalAttemptsFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            )}
            {chartType === 'attempts' && (
              <Area
                type="monotone"
                dataKey="avgCorrectAttempts"
                stroke="hsl(150, 100%, 40%)"
                fill="url(#correctAttemptsFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            )}
          </AreaChart>
        )}
      </ChartContainer>
    </CardContent>
  </Card>
);

// Loading skeleton component
const StatsLoadingSkeleton = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 xl:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="flex flex-col gap-1.5 p-3">
            <div className="flex items-start justify-between gap-2 pl-2">
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-7 w-14" />
              </div>
              <Skeleton className="size-8 shrink-0 rounded-lg" />
            </div>
            <Skeleton className="ml-2 h-2.5 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card className="w-full">
      <CardHeader className="px-3 py-2">
        <Skeleton className="h-8 w-48" />
      </CardHeader>
      <CardContent className="p-2 sm:p-3">
        <Skeleton className="h-60 w-full sm:h-72 md:h-80" />
      </CardContent>
    </Card>
  </div>
);

// Top filter controls — gameplay mode + period
const StatsFilterControls = ({
  period,
  setPeriod,
  gameplayMode,
  setGameplayMode
}: {
  period: PeriodType;
  setPeriod: (period: PeriodType) => void;
  gameplayMode: GameplayMode;
  setGameplayMode: (mode: GameplayMode) => void;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
    <GameplayModeSelector gameplayMode={gameplayMode} setGameplayMode={setGameplayMode} />
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Period</span>
      <Select
        items={PERIOD_ITEMS}
        value={period}
        onValueChange={(value) => {
          if (value) setPeriod(value);
        }}
      >
        <SelectTrigger size="sm" className="h-8 w-36" aria-label="Select period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all_time">All Time</SelectItem>
          <SelectItem value="last_week">Last Week</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
          <SelectItem value="last_3_months">Last 3 Months</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

const CustomDateRangeRow = ({
  dateRange,
  setDateRange
}: {
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-xs font-medium text-muted-foreground">From</span>
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 justify-start text-left font-normal',
              !dateRange.from && 'text-muted-foreground'
            )}
          />
        }
      >
        <CalendarIcon className="mr-1.5 size-3.5" />
        {dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : 'Pick date'}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateRange.from}
          onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
          disabled={(date) => !!dateRange.to && date > dateRange.to}
        />
      </PopoverContent>
    </Popover>
    <span className="text-xs font-medium text-muted-foreground">To</span>
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 justify-start text-left font-normal',
              !dateRange.to && 'text-muted-foreground'
            )}
          />
        }
      >
        <CalendarIcon className="mr-1.5 size-3.5" />
        {dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'Pick date'}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateRange.to}
          onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
          disabled={(date) => !!dateRange.from && date < dateRange.from}
        />
      </PopoverContent>
    </Popover>
  </div>
);

// Summary cards component
type SummaryStats = {
  totalSessions: number;
  totalCompletions: number;
  completionRate: number;
  avgTimeTaken: number;
  avgAccuracy: number;
};

const StatMetricCard = ({
  title,
  value,
  description,
  icon: Icon,
  accent
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: { bar: string; iconBg: string; iconColor: string };
}) => (
  <Card className="overflow-hidden border-slate-200/50 bg-linear-to-br from-white/80 to-slate-50/40 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700/50 dark:from-slate-900/80 dark:to-slate-800/40">
    <CardContent className="relative flex flex-col gap-1.5 p-3">
      <div className={cn('absolute inset-y-2 left-0 w-1 rounded-r-full', accent.bar)} />
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0 space-y-1">
          <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
            {title}
          </p>
          <p className="text-xl leading-none font-bold tracking-tight tabular-nums sm:text-2xl">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/5 ring-inset dark:ring-white/10',
            accent.iconBg
          )}
        >
          <Icon className={cn('size-3.5', accent.iconColor)} />
        </div>
      </div>
      <p className="pl-2 text-[0.7rem] text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const SummaryCards = ({ summaryStats }: { summaryStats: SummaryStats }) => (
  <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 xl:grid-cols-5">
    <StatMetricCard
      title="Total Started"
      value={summaryStats.totalSessions.toLocaleString()}
      description="Games started"
      icon={UsersIcon}
      accent={{
        bar: 'bg-blue-500',
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400'
      }}
    />
    <StatMetricCard
      title="Completions"
      value={summaryStats.totalCompletions.toLocaleString()}
      description="Puzzles completed"
      icon={CheckCircle2Icon}
      accent={{
        bar: 'bg-emerald-500',
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400'
      }}
    />
    <StatMetricCard
      title="Completion Rate"
      value={`${summaryStats.completionRate}%`}
      description="Of started games"
      icon={TrendingUpIcon}
      accent={{
        bar: 'bg-violet-500',
        iconBg: 'bg-violet-500/10',
        iconColor: 'text-violet-600 dark:text-violet-400'
      }}
    />
    <StatMetricCard
      title="Avg Time"
      value={pretty_ms(summaryStats.avgTimeTaken * 1000)}
      description="Per completion"
      icon={ClockIcon}
      accent={{
        bar: 'bg-amber-500',
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-600 dark:text-amber-400'
      }}
    />
    <StatMetricCard
      title="Avg Accuracy"
      value={`${summaryStats.avgAccuracy}%`}
      description="Per completion"
      icon={CrosshairIcon}
      accent={{
        bar: 'bg-rose-500',
        iconBg: 'bg-rose-500/10',
        iconColor: 'text-rose-600 dark:text-rose-400'
      }}
    />
  </div>
);

// Chart selector component
const ChartSelector = ({
  chartType,
  setChartType
}: {
  chartType: ChartType;
  setChartType: (chartType: ChartType) => void;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <label className="text-xs font-medium text-muted-foreground">View</label>
    <Select
      items={CHART_TYPE_ITEMS}
      value={chartType}
      onValueChange={(value) => {
        if (value) setChartType(value);
      }}
    >
      <SelectTrigger size="sm" className="h-8 w-52" aria-label="Select view">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sessions-completions">Started and Completed</SelectItem>
        <SelectItem value="avg-time">Average Time</SelectItem>
        <SelectItem value="avg-accuracy">Average Accuracy</SelectItem>
        <SelectItem value="attempts">Total and Correct Attempts</SelectItem>
        <SelectItem value="location">Location</SelectItem>
        <SelectItem value="script">Script</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const GameplayModeSelector = ({
  gameplayMode,
  setGameplayMode
}: {
  gameplayMode: GameplayMode;
  setGameplayMode: (mode: GameplayMode) => void;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <label className="text-xs font-medium text-muted-foreground">Gameplay mode</label>
    <Select
      items={GAMEPLAY_MODE_ITEMS}
      value={gameplayMode}
      onValueChange={(value) => {
        if (value) setGameplayMode(value);
      }}
    >
      <SelectTrigger size="sm" className="h-8 w-32" aria-label="Select gameplay mode">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="practice">Practice</SelectItem>
        <SelectItem value="unguided">No Hint</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

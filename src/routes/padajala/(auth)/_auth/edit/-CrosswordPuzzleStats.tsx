'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
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
  TrendingUpIcon,
  UsersIcon,
  ClockIcon,
  CheckCircle2Icon,
  CrosshairIcon
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import pretty_ms from 'pretty-ms';
import CrosswordPuzzleSelector, { type SelectedPuzzle } from './-CrosswordPuzzleSelector';
import { UserSelector, type SelectedUser } from '~/components/analytics/UserSelector';
import { TopPlayedLeader } from '~/components/analytics/TopPlayedLeader';
import {
  AnalyticsCustomRangePicker,
  AnalyticsPeriodSelect
} from '~/components/analytics/AnalyticsPeriodFilter';
import {
  useAnalyticsPeriod,
  type AnalyticsPeriodState
} from '~/components/analytics/analytics_period';
import {
  AnalyticsStatCardsSkeleton,
  AnalyticsStatGrid,
  type AnalyticsStat
} from '~/components/analytics/AnalyticsStatCards';

type ChartType =
  | 'sessions-completions'
  | 'avg-time'
  | 'avg-accuracy'
  | 'letter-inputs'
  | 'location';

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
    const totalLetterInputs = chunk.reduce((sum, d) => sum + d.totalLetterInputs, 0);
    const totalIncorrectAttempts = chunk.reduce((sum, d) => sum + d.totalIncorrectAttempts, 0);
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
      totalLetterInputs,
      totalIncorrectAttempts,
      avgTimeTaken: completions > 0 ? Math.round(totalTimeTaken / completions) : 0,
      avgAccuracy: completions > 0 ? Math.round(totalAccuracy / completions) : 0,
      avgLetterInputs: completions > 0 ? Math.round(totalLetterInputs / completions) : 0,
      avgIncorrectAttempts: completions > 0 ? Math.round(totalIncorrectAttempts / completions) : 0
    });
  }

  return buckets;
}

const CHART_TYPE_ITEMS = [
  { label: 'Started and Completed', value: 'sessions-completions' as const },
  { label: 'Average Time', value: 'avg-time' as const },
  { label: 'Average Accuracy', value: 'avg-accuracy' as const },
  { label: 'Letter Inputs / Incorrect', value: 'letter-inputs' as const },
  { label: 'Location', value: 'location' as const }
];

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
  avgLetterInputs: {
    label: 'Letter Inputs',
    color: 'hsl(200 100% 50%)'
  },
  avgIncorrectAttempts: {
    label: 'Incorrect Attempts',
    color: 'hsl(0 70% 50%)'
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
    avgLetterInputs: number;
    avgIncorrectAttempts: number;
    date: string;
    endDate: string;
    label: string;
    tooltipLabel: string;
    sessions: number;
    completions: number;
    totalTimeTaken: number;
    totalAccuracy: number;
    totalLetterInputs: number;
    totalIncorrectAttempts: number;
  }[];
  locationFrequency: {
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
    const totalAttempts = data.avgLetterInputs || 0;
    const correctAttempts = data.avgIncorrectAttempts || 0;

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
              <span className="text-sm">Letter Inputs: {totalAttempts}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: 'hsl(0 70% 50%)' }}
              />
              <span className="text-sm">Incorrect Attempts: {correctAttempts}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 border-t pt-1">
              <span className="text-sm font-medium">Avg Accuracy: {data.avgAccuracy || 0}%</span>
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

type ResolvedRange = { from: Date; to: Date } | null;

type CrosswordStatsSession = { created_at: Date | string; location: string | null };
type CrosswordStatsCompletion = {
  created_at: Date | string;
  time_taken: number;
  accuracy: number;
  letter_inputs: number;
  incorrect_entry_attempts: number;
};

function initialSelectedPuzzles(puzzleId?: number, puzzleTitle?: string): SelectedPuzzle[] {
  return puzzleId && puzzleTitle ? [{ id: puzzleId, title: puzzleTitle }] : [];
}

function selectionLabel(selectedPuzzles: SelectedPuzzle[], selectedUsers: SelectedUser[]): string {
  const puzzlePart =
    selectedPuzzles.length === 0
      ? 'all puzzles'
      : selectedPuzzles.length === 1
        ? selectedPuzzles[0]!.title
        : `${selectedPuzzles.length} puzzles`;
  const userPart =
    selectedUsers.length === 0
      ? 'all users'
      : selectedUsers.length === 1
        ? selectedUsers[0]!.name
        : `${selectedUsers.length} users`;
  return `Analytics for ${puzzlePart} · ${userPart}`;
}

type DailyBucketTotals = {
  date: string;
  sessions: number;
  completions: number;
  totalTimeTaken: number;
  totalAccuracy: number;
  totalLetterInputs: number;
  totalIncorrectAttempts: number;
};

function emptyDailyBucket(dateKey: string): DailyBucketTotals {
  return {
    date: dateKey,
    sessions: 0,
    completions: 0,
    totalTimeTaken: 0,
    totalAccuracy: 0,
    totalLetterInputs: 0,
    totalIncorrectAttempts: 0
  };
}

function avgPerCompletion(total: number, completions: number): number {
  return completions > 0 ? Math.round(total / completions) : 0;
}

function buildDailyStats(
  sessions: CrosswordStatsSession[],
  stats: CrosswordStatsCompletion[],
  allTime: boolean,
  effectiveDateRange: ResolvedRange
): DailyStatPoint[] {
  // Create daily aggregation
  const dailyMap = new Map<string, DailyBucketTotals>();

  for (const session of sessions) {
    const dateKey = format(new Date(session.created_at), 'yyyy-MM-dd');
    const existing = dailyMap.get(dateKey) ?? emptyDailyBucket(dateKey);
    existing.sessions += 1;
    dailyMap.set(dateKey, existing);
  }

  for (const stat of stats) {
    const dateKey = format(new Date(stat.created_at), 'yyyy-MM-dd');
    const existing = dailyMap.get(dateKey) ?? emptyDailyBucket(dateKey);
    existing.completions += 1;
    existing.totalTimeTaken += stat.time_taken;
    existing.totalAccuracy += stat.accuracy;
    existing.totalLetterInputs += stat.letter_inputs;
    existing.totalIncorrectAttempts += stat.incorrect_entry_attempts;
    dailyMap.set(dateKey, existing);
  }

  // Calculate averages for each day
  const dailyStatsRaw = Array.from(dailyMap.values())
    .map((day) => ({
      ...day,
      endDate: day.date,
      label: '',
      tooltipLabel: '',
      avgTimeTaken: avgPerCompletion(day.totalTimeTaken, day.completions),
      avgAccuracy: avgPerCompletion(day.totalAccuracy, day.completions),
      avgLetterInputs: avgPerCompletion(day.totalLetterInputs, day.completions),
      avgIncorrectAttempts: avgPerCompletion(day.totalIncorrectAttempts, day.completions)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const showYearInTooltip = shouldShowYearInTooltip(
    allTime,
    effectiveDateRange,
    dailyStatsRaw.map((d) => d.date)
  );

  return bucketDailyStats(
    dailyStatsRaw.map((day) => {
      const { label, tooltipLabel, endDate } = buildDateLabels(
        day.date,
        day.endDate,
        showYearInTooltip
      );
      return { ...day, endDate, label, tooltipLabel };
    }),
    showYearInTooltip
  );
}

// Calculate location frequency (ignore null values)
function buildLocationFrequency(
  sessions: CrosswordStatsSession[]
): { name: string; frequency: number }[] {
  const locationMap = new Map<string, number>();
  for (const session of sessions) {
    if (session.location === null) continue;
    const count = locationMap.get(session.location) ?? 0;
    locationMap.set(session.location, count + 1);
  }
  return Array.from(locationMap.entries())
    .map(([name, frequency]) => ({ name, frequency }))
    .sort((a, b) => b.frequency - a.frequency);
}

function computeChartData(
  filteredStatsData: {
    sessions: CrosswordStatsSession[];
    stats: CrosswordStatsCompletion[];
  } | null,
  allTime: boolean,
  effectiveDateRange: ResolvedRange
): ChartDataType {
  if (!filteredStatsData) {
    return { dailyStats: [], locationFrequency: [], isBucketed: false };
  }

  const { sessions, stats } = filteredStatsData;
  const dailyStats = buildDailyStats(sessions, stats, allTime, effectiveDateRange);

  return {
    dailyStats,
    locationFrequency: buildLocationFrequency(sessions),
    isBucketed: dailyStats.length > MAX_CHART_POINTS
  };
}

function meanRound(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

// Summary statistics
function computeSummaryStats(
  filteredStatsData: {
    sessions: CrosswordStatsSession[];
    stats: CrosswordStatsCompletion[];
  } | null
) {
  if (!filteredStatsData) return null;

  const { sessions, stats } = filteredStatsData;

  return {
    totalSessions: sessions.length,
    totalCompletions: stats.length,
    completionRate: sessions.length > 0 ? Math.round((stats.length / sessions.length) * 100) : 0,
    avgTimeTaken: meanRound(stats.map((stat) => stat.time_taken)),
    avgAccuracy: meanRound(stats.map((stat) => stat.accuracy))
  };
}

const PuzzleStats = ({ puzzleId, puzzleTitle }: PuzzleStatsProps) => {
  const isEmbedded = puzzleId != null;
  const [chartType, setChartType] = useState<ChartType>('sessions-completions');
  const [selectedPuzzles, setSelectedPuzzles] = useState<SelectedPuzzle[]>(() =>
    initialSelectedPuzzles(puzzleId, puzzleTitle)
  );
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const period = useAnalyticsPeriod('last_month');

  const effectiveDateRange = period.effectiveRange;
  const puzzleIds = selectedPuzzles.length > 0 ? selectedPuzzles.map((p) => p.id) : undefined;
  const userIds = selectedUsers.length > 0 ? selectedUsers.map((user) => user.id) : undefined;
  const allTime = period.allTime;

  const statsQueryEnabled = period.isReady;

  const trpc = useTRPC();

  const statsQuery = useQuery(
    trpc.crossword.stats.get_stats_data.queryOptions(
      {
        puzzle_ids: puzzleIds,
        user_ids: userIds,
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
    trpc.crossword.stats.get_top_puzzles.queryOptions(
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

  const topUsersQuery = useQuery(
    trpc.crossword.stats.get_top_users.queryOptions(
      {
        all_time: allTime,
        start_date: effectiveDateRange?.from,
        end_date: effectiveDateRange?.to,
        limit: 10,
        puzzle_ids: puzzleIds
      },
      {
        enabled: !isEmbedded && statsQueryEnabled
      }
    )
  );

  const filteredStatsData = statsQuery.data ?? null;

  // Process data for charts
  const chartData = useMemo(
    () => computeChartData(filteredStatsData, allTime, effectiveDateRange),
    [filteredStatsData, allTime, effectiveDateRange]
  );

  const summaryStats = useMemo(() => computeSummaryStats(filteredStatsData), [filteredStatsData]);

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">Puzzle Statistics</h2>
          <p className="text-sm text-muted-foreground">
            {selectionLabel(selectedPuzzles, selectedUsers)}
          </p>
        </div>
        <StatsFilterControls period={period} />
      </div>

      <CrosswordPuzzleSelector
        selectedPuzzles={selectedPuzzles}
        onSelectedPuzzlesChange={setSelectedPuzzles}
        locked={isEmbedded}
      />
      <UserSelector
        game="padajala"
        selectedUsers={selectedUsers}
        onSelectedUsersChange={setSelectedUsers}
      />

      <StatsQueryPanel
        isEmbedded={isEmbedded}
        isLoading={statsQuery.isLoading}
        isError={statsQuery.isError}
        isSuccess={statsQuery.isSuccess}
        topPuzzles={topPuzzlesQuery.data?.puzzles ?? []}
        topPuzzlesLoading={topPuzzlesQuery.isLoading}
        topUsers={topUsersQuery.data?.users ?? []}
        topUsersLoading={topUsersQuery.isLoading}
        summaryStats={summaryStats}
        chartData={chartData}
        chartType={chartType}
        setChartType={setChartType}
      />
    </div>
  );
};

type StatsQueryPanelProps = {
  isEmbedded: boolean;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  topPuzzles: TopPuzzleRow[];
  topPuzzlesLoading: boolean;
  topUsers: TopUserRow[];
  topUsersLoading: boolean;
  summaryStats: ReturnType<typeof computeSummaryStats>;
  chartData: ChartDataType;
  chartType: ChartType;
  setChartType: (chartType: ChartType) => void;
};

function StatsQueryPanel({
  isEmbedded,
  isLoading,
  isError,
  isSuccess,
  topPuzzles,
  topPuzzlesLoading,
  topUsers,
  topUsersLoading,
  summaryStats,
  chartData,
  chartType,
  setChartType
}: StatsQueryPanelProps) {
  return (
    <>
      {isLoading ? <StatsLoadingSkeleton /> : null}
      {isError ? (
        <div className="py-8 text-center">
          <div className="text-destructive">Failed to load statistics</div>
        </div>
      ) : null}
      {isSuccess ? (
        <StatsContentBody
          isEmbedded={isEmbedded}
          topPuzzles={topPuzzles}
          topPuzzlesLoading={topPuzzlesLoading}
          topUsers={topUsers}
          topUsersLoading={topUsersLoading}
          summaryStats={summaryStats}
          chartData={chartData}
          chartType={chartType}
          setChartType={setChartType}
        />
      ) : null}
    </>
  );
}

type StatsContentBodyProps = {
  isEmbedded: boolean;
  topPuzzles: TopPuzzleRow[];
  topPuzzlesLoading: boolean;
  topUsers: TopUserRow[];
  topUsersLoading: boolean;
  summaryStats: ReturnType<typeof computeSummaryStats>;
  chartData: ChartDataType;
  chartType: ChartType;
  setChartType: (chartType: ChartType) => void;
};

const StatsContentBody = ({
  isEmbedded,
  topPuzzles,
  topPuzzlesLoading,
  topUsers,
  topUsersLoading,
  summaryStats,
  chartData,
  chartType,
  setChartType
}: StatsContentBodyProps) => {
  if (!summaryStats) return null;

  return (
    <>
      {!isEmbedded && (
        <div className="flex flex-col gap-3">
          <TopPlayedLeader
            variant="puzzles"
            accordionValue="top-puzzles"
            title="Top Played Puzzles"
            subtitle="Top 10 by plays"
            emptyMessage="No puzzle plays in this period"
            isLoading={topPuzzlesLoading}
            items={topPuzzles.map((puzzle) => ({
              id: String(puzzle.puzzle_id),
              title: puzzle.title,
              started: puzzle.started,
              completed: puzzle.completed
            }))}
          />
          <TopPlayedLeader
            variant="users"
            accordionValue="top-users"
            title="Top Players"
            subtitle="Top 10 by plays"
            emptyMessage="No signed-in plays in this period"
            isLoading={topUsersLoading}
            items={topUsers.map((user) => ({
              id: user.user_id,
              title: user.name,
              started: user.started,
              completed: user.completed
            }))}
          />
        </div>
      )}
      {/* Summary Cards */}
      <AnalyticsStatGrid stats={summaryStatCards(summaryStats)} />

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
  );
};

export default PuzzleStats;

type TopPuzzleRow = {
  puzzle_id: number;
  title: string;
  started: number;
  completed: number;
};

type TopUserRow = {
  user_id: string;
  name: string;
  started: number;
  completed: number;
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
        {chartType === 'location' ? (
          <BarChart
            data={chartData.locationFrequency}
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
                ) : chartType === 'letter-inputs' ? (
                  <AttemptsTooltip />
                ) : chartType === 'avg-time' ? (
                  <AvgTimeTooltip />
                ) : (
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      // SAFETY: recharts tooltip payload entries carry the chart's DailyStatPoint
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
            {chartType === 'letter-inputs' && (
              <Area
                type="monotone"
                dataKey="avgLetterInputs"
                stroke="hsl(200, 100%, 50%)"
                fill="url(#totalAttemptsFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            )}
            {chartType === 'letter-inputs' && (
              <Area
                type="monotone"
                dataKey="avgIncorrectAttempts"
                stroke="hsl(0, 70%, 50%)"
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
    <AnalyticsStatCardsSkeleton />
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

// Top filter controls — period (custom pickers sit under the row)
const StatsFilterControls = ({ period }: { period: AnalyticsPeriodState }) => (
  <div className="flex flex-col gap-2 sm:items-end">
    <AnalyticsPeriodSelect period={period.period} onPeriodChange={period.setPeriod} />
    {period.period === 'custom' ? (
      <AnalyticsCustomRangePicker
        dateRange={period.dateRange}
        onDateRangeChange={period.setDateRange}
      />
    ) : null}
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

function summaryStatCards(summaryStats: SummaryStats): AnalyticsStat[] {
  return [
    {
      label: 'Total Started',
      value: summaryStats.totalSessions.toLocaleString(),
      hint: 'Games started',
      icon: UsersIcon,
      accent: 'sky'
    },
    {
      label: 'Completions',
      value: summaryStats.totalCompletions.toLocaleString(),
      hint: 'Puzzles completed',
      icon: CheckCircle2Icon,
      accent: 'emerald'
    },
    {
      label: 'Completion Rate',
      value: `${summaryStats.completionRate}%`,
      hint: 'Of started games',
      icon: TrendingUpIcon,
      accent: 'violet'
    },
    {
      label: 'Avg Time',
      value: pretty_ms(summaryStats.avgTimeTaken * 1000),
      hint: 'Per completion',
      icon: ClockIcon,
      accent: 'amber'
    },
    {
      label: 'Avg Accuracy',
      value: `${summaryStats.avgAccuracy}%`,
      hint: 'Per completion',
      icon: CrosshairIcon,
      accent: 'rose'
    }
  ];
}

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
        <SelectItem value="letter-inputs">Letter Inputs / Incorrect</SelectItem>
        <SelectItem value="location">Location</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

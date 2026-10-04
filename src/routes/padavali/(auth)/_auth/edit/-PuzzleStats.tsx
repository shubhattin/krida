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
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import PuzzleSelector, { type SelectedPuzzle } from './-PuzzleSelector';
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

type ResolvedRange = { from: Date; to: Date } | null;

type GameplayMode = 'all' | 'practice' | 'unguided';
type ChartType =
  | 'sessions-completions'
  | 'avg-time'
  | 'avg-accuracy'
  | 'attempts'
  | 'location'
  | 'script';

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

type ModeFilteredStats = { sessions: StatsSession[]; stats: StatsCompletion[] };

function filterByGameplayMode(
  sessions: StatsSession[],
  stats: StatsCompletion[],
  mode: GameplayMode
): ModeFilteredStats {
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
  totalTotalAttempts: number;
  totalCorrectAttempts: number;
};

function emptyDailyBucket(dateKey: string): DailyBucketTotals {
  return {
    date: dateKey,
    sessions: 0,
    completions: 0,
    totalTimeTaken: 0,
    totalAccuracy: 0,
    totalTotalAttempts: 0,
    totalCorrectAttempts: 0
  };
}

function avgPerCompletion(total: number, completions: number): number {
  return completions > 0 ? Math.round(total / completions) : 0;
}

function buildDailyStats(
  sessions: StatsSession[],
  stats: StatsCompletion[],
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
    existing.totalTotalAttempts += stat.total_attempts;
    existing.totalCorrectAttempts += stat.correct_attempts;
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
      avgTotalAttempts: avgPerCompletion(day.totalTotalAttempts, day.completions),
      avgCorrectAttempts: avgPerCompletion(day.totalCorrectAttempts, day.completions)
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
function buildLocationFrequency(sessions: StatsSession[]): { name: string; frequency: number }[] {
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

// Calculate script frequency (use DEFAULT_DATA_SCRIPT for null values)
function buildScriptFrequency(sessions: StatsSession[]): { name: string; frequency: number }[] {
  const scriptMap = new Map<string, number>();
  for (const session of sessions) {
    const script = session.script ?? DEFAULT_DATA_SCRIPT;
    const count = scriptMap.get(script) ?? 0;
    scriptMap.set(script, count + 1);
  }
  return Array.from(scriptMap.entries())
    .map(([name, frequency]) => ({ name, frequency }))
    .sort((a, b) => b.frequency - a.frequency);
}

function computeChartData(
  filteredStatsData: { sessions: StatsSession[]; stats: StatsCompletion[] } | null,
  allTime: boolean,
  effectiveDateRange: ResolvedRange
): ChartDataType {
  if (!filteredStatsData) {
    return { dailyStats: [], locationFrequency: [], scriptFrequency: [], isBucketed: false };
  }

  const { sessions, stats } = filteredStatsData;
  const dailyStats = buildDailyStats(sessions, stats, allTime, effectiveDateRange);

  return {
    dailyStats,
    locationFrequency: buildLocationFrequency(sessions),
    scriptFrequency: buildScriptFrequency(sessions),
    isBucketed: dailyStats.length > MAX_CHART_POINTS
  };
}

function meanRound(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

// Summary statistics
function computeSummaryStats(
  filteredStatsData: { sessions: StatsSession[]; stats: StatsCompletion[] } | null
) {
  if (!filteredStatsData) return null;

  const { sessions, stats } = filteredStatsData;

  return {
    totalSessions: sessions.length,
    totalCompletions: stats.length,
    // Completion rate from completed sessions
    completionRate: sessions.length > 0 ? Math.round((stats.length / sessions.length) * 100) : 0,
    avgTimeTaken: meanRound(stats.map((stat) => stat.time_taken)),
    avgAccuracy: meanRound(stats.map((stat) => stat.accuracy))
  };
}

const PuzzleStats = ({ puzzleId, puzzleTitle }: PuzzleStatsProps) => {
  const isEmbedded = puzzleId != null;
  const [gameplayMode, setGameplayMode] = useState<GameplayMode>('all');
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
    trpc.puzzle.stats.get_stats_data.queryOptions(
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

  const topUsersQuery = useQuery(
    trpc.puzzle.stats.get_top_users.queryOptions(
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
        <StatsFilterControls
          period={period}
          gameplayMode={gameplayMode}
          setGameplayMode={setGameplayMode}
        />
      </div>

      <PuzzleSelector
        selectedPuzzles={selectedPuzzles}
        onSelectedPuzzlesChange={setSelectedPuzzles}
        locked={isEmbedded}
      />
      <UserSelector
        game="padavali"
        selectedUsers={selectedUsers}
        onSelectedUsersChange={setSelectedUsers}
      />

      {statsQuery.isLoading && <StatsLoadingSkeleton />}
      {statsQuery.isError && (
        <div className="py-8 text-center">
          <div className="text-destructive">Failed to load statistics</div>
        </div>
      )}
      {/* Stats Content */}
      {!statsQuery.isLoading && statsQuery.isSuccess && (
        <StatsContentBody
          isEmbedded={isEmbedded}
          topPuzzles={topPuzzlesQuery.data?.puzzles ?? []}
          topPuzzlesLoading={topPuzzlesQuery.isLoading}
          topUsers={topUsersQuery.data?.users ?? []}
          topUsersLoading={topUsersQuery.isLoading}
          summaryStats={summaryStats}
          chartData={chartData}
          chartType={chartType}
          setChartType={setChartType}
        />
      )}
    </div>
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

// Top filter controls — gameplay mode + period (custom pickers sit under the row)
const StatsFilterControls = ({
  period,
  gameplayMode,
  setGameplayMode
}: {
  period: AnalyticsPeriodState;
  gameplayMode: GameplayMode;
  setGameplayMode: (mode: GameplayMode) => void;
}) => (
  <div className="flex flex-col gap-2 sm:items-end">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <GameplayModeSelector gameplayMode={gameplayMode} setGameplayMode={setGameplayMode} />
      <AnalyticsPeriodSelect period={period.period} onPeriodChange={period.setPeriod} />
    </div>
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

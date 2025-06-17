'use client';

import { useState, useMemo } from 'react';
import { client_q } from '~/api/client';
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
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '~/components/ui/chart';
import { XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { CalendarIcon, TrendingUpIcon, UsersIcon, ClockIcon, TargetIcon } from 'lucide-react';
import { cn } from '~/lib/utils';
import { format } from 'date-fns';
import pretty_ms from 'pretty-ms';

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type PeriodType = 'last7days' | 'custom';
type ChartType = 'sessions-completions' | 'avg-time' | 'avg-accuracy' | 'attempts';

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
  }
};

type ChartDataType = {
  dailyStats: {
    avgTimeTaken: number;
    avgAccuracy: number;
    avgTotalAttempts: number;
    avgCorrectAttempts: number;
    date: string;
    sessions: number;
    completions: number;
    totalTimeTaken: number;
    totalAccuracy: number;
    totalTotalAttempts: number;
    totalCorrectAttempts: number;
  }[];
};

// Main component
const PuzzleStats = ({ puzzleId }: { puzzleId: number }) => {
  const [period, setPeriod] = useState<PeriodType>('last7days');
  const [chartType, setChartType] = useState<ChartType>('sessions-completions');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // default to last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    return {
      from: sevenDaysAgo,
      to: today
    };
  });

  // Update date range when period changes
  const effectiveDateRange = useMemo(() => {
    if (period === 'last7days') {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      return {
        from: sevenDaysAgo,
        to: today
      };
    }
    return dateRange;
  }, [period, dateRange]);

  // Fetch stats data
  const statsQuery = client_q.padavali.stats.get_stats_data.useQuery(
    {
      puzzle_id: puzzleId,
      start_date: effectiveDateRange.from!,
      end_date: effectiveDateRange.to!
    },
    {
      enabled: !!(effectiveDateRange.from && effectiveDateRange.to)
    }
  );

  // Process data for charts
  const chartData = useMemo(() => {
    if (!statsQuery.data) return { dailyStats: [] };

    const { sessions, stats } = statsQuery.data;

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
    const dailyStats = Array.from(dailyMap.values())
      .map((day) => ({
        ...day,
        avgTimeTaken: day.completions > 0 ? Math.round(day.totalTimeTaken / day.completions) : 0,
        avgAccuracy: day.completions > 0 ? Math.round(day.totalAccuracy / day.completions) : 0,
        avgTotalAttempts:
          day.completions > 0 ? Math.round(day.totalTotalAttempts / day.completions) : 0,
        avgCorrectAttempts:
          day.completions > 0 ? Math.round(day.totalCorrectAttempts / day.completions) : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { dailyStats };
  }, [statsQuery.data]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!statsQuery.data) return null;

    const { sessions, stats } = statsQuery.data;

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
  }, [statsQuery.data]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Puzzle Statistics</h2>
        <p className="text-muted-foreground">Analytics and insights for puzzle gameplay data</p>
      </div>

      {/* Date Range Controls */}
      <DateRangeControls
        period={period}
        setPeriod={setPeriod}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />
      {statsQuery.isLoading && <StatsLoadingSkeleton />}
      {statsQuery.isError && (
        <div className="py-8 text-center">
          <div className="text-destructive">Failed to load statistics</div>
        </div>
      )}
      {/* Stats Content */}
      {!statsQuery.isLoading && statsQuery.isSuccess && summaryStats && (
        <>
          {/* Summary Cards */}
          <SummaryCards summaryStats={summaryStats} />

          {/* Charts */}
          <ChartsSection
            chartData={chartData}
            chartConfig={DEFAULT_CHART_CONFIG}
            chartType={chartType}
            setChartType={setChartType}
          />

          {/* No Data State */}
          {summaryStats.totalSessions === 0 && (
            <div className="py-8 text-center">
              <div className="text-muted-foreground">
                No data available for the selected time period
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PuzzleStats;

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
  <div className="w-full">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-center">
        <div className="w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
          {/* Daily Activity Chart */}
          <Card>
            <CardHeader>
              <ChartSelector chartType={chartType} setChartType={setChartType} />
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <ChartContainer config={chartConfig} className="h-64 sm:h-72 md:h-80 lg:h-96">
                <LineChart data={chartData.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    className="stroke-muted-foreground"
                    tick={{ className: 'fill-muted-foreground', fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    className="stroke-muted-foreground"
                    tick={{ className: 'fill-muted-foreground', fontSize: 12 }}
                    width={40}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(value) => format(new Date(value as string), 'PPP')}
                  />

                  {/* Sessions and Completions Lines */}
                  {chartType === 'sessions-completions' && (
                    <Line
                      dataKey="sessions"
                      stroke="hsl(210, 100%, 45%)" // blue
                      strokeWidth={3}
                      dot={{
                        fill: 'hsl(210, 100%, 45%)',
                        strokeWidth: 2,
                        r: 5,
                        stroke: 'hsl(210, 100%, 45%)',
                        className: 'drop-shadow-sm'
                      }}
                      activeDot={{
                        r: 7,
                        fill: 'hsl(210, 100%, 45%)',
                        stroke: 'white',
                        strokeWidth: 2,
                        className: 'drop-shadow-md'
                      }}
                    />
                  )}
                  {chartType === 'sessions-completions' && (
                    <Line
                      dataKey="completions"
                      stroke="hsl(140, 70%, 40%)" // green
                      strokeWidth={3}
                      dot={{
                        fill: 'hsl(140, 70%, 40%)',
                        strokeWidth: 2,
                        r: 5,
                        stroke: 'hsl(140, 70%, 40%)',
                        className: 'drop-shadow-sm'
                      }}
                      activeDot={{
                        r: 7,
                        fill: 'hsl(140, 70%, 40%)',
                        stroke: 'white',
                        strokeWidth: 2,
                        className: 'drop-shadow-md'
                      }}
                    />
                  )}
                  {chartType === 'avg-time' && (
                    <Line
                      dataKey="avgTimeTaken"
                      stroke="hsl(120 100% 40%)"
                      strokeWidth={3}
                      dot={{
                        fill: 'hsl(120 100% 40%)',
                        strokeWidth: 2,
                        r: 5,
                        stroke: 'hsl(120 100% 40%)',
                        className: 'drop-shadow-sm'
                      }}
                      activeDot={{
                        r: 7,
                        fill: 'hsl(120 100% 40%)',
                        stroke: 'white',
                        strokeWidth: 2,
                        className: 'drop-shadow-md'
                      }}
                    />
                  )}
                  {chartType === 'avg-accuracy' && (
                    <Line
                      dataKey="avgAccuracy"
                      stroke="hsl(30 100% 50%)"
                      strokeWidth={3}
                      dot={{
                        fill: 'hsl(30 100% 50%)',
                        strokeWidth: 2,
                        r: 5,
                        stroke: 'hsl(30 100% 50%)',
                        className: 'drop-shadow-sm'
                      }}
                      activeDot={{
                        r: 7,
                        fill: 'hsl(30 100% 50%)',
                        stroke: 'white',
                        strokeWidth: 2,
                        className: 'drop-shadow-md'
                      }}
                    />
                  )}
                  {chartType === 'attempts' && (
                    <Line
                      dataKey="avgTotalAttempts"
                      stroke="hsl(200 100% 50%)"
                      strokeWidth={3}
                      dot={{
                        fill: 'hsl(200 100% 50%)',
                        strokeWidth: 2,
                        r: 5,
                        stroke: 'hsl(200 100% 50%)',
                        className: 'drop-shadow-sm'
                      }}
                      activeDot={{
                        r: 7,
                        fill: 'hsl(200 100% 50%)',
                        stroke: 'white',
                        strokeWidth: 2,
                        className: 'drop-shadow-md'
                      }}
                    />
                  )}
                  {chartType === 'attempts' && (
                    <Line
                      dataKey="avgCorrectAttempts"
                      stroke="hsl(150 100% 40%)"
                      strokeWidth={3}
                      dot={{
                        fill: 'hsl(150 100% 40%)',
                        strokeWidth: 2,
                        r: 5,
                        stroke: 'hsl(150 100% 40%)',
                        className: 'drop-shadow-sm'
                      }}
                      activeDot={{
                        r: 7,
                        fill: 'hsl(150 100% 40%)',
                        stroke: 'white',
                        strokeWidth: 2,
                        className: 'drop-shadow-md'
                      }}
                    />
                  )}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
);

// Loading skeleton component
const StatsLoadingSkeleton = () => (
  <div className="space-y-6 p-6">
    {/* Header skeleton */}

    {/* Summary cards skeleton */}
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-1 h-6 w-12" />
            <Skeleton className="h-2 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Charts skeleton */}
    <div className="w-full">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
            <Card>
              <CardHeader>
                <Skeleton className="mx-auto h-6 w-32 sm:mx-0" />
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <Skeleton className="h-64 w-full sm:h-72 md:h-80 lg:h-96" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Date range controls component
const DateRangeControls = ({
  period,
  setPeriod,
  dateRange,
  setDateRange
}: {
  period: PeriodType;
  setPeriod: (period: PeriodType) => void;
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
}) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
    <div className="space-y-2">
      <label className="text-sm font-medium">Time Period</label>
      <Select value={period} onValueChange={(value: PeriodType) => setPeriod(value)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last7days">Last 7 Days</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {period === 'custom' && (
      <>
        <div className="space-y-2">
          <label className="text-sm font-medium">From Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-40 justify-start text-left font-normal',
                  !dateRange.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? format(dateRange.from, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                disabled={(date) => !!dateRange.to && date >= dateRange.to}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">To Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-40 justify-start text-left font-normal',
                  !dateRange.to && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.to ? format(dateRange.to, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                disabled={(date) => !!dateRange.from && date <= dateRange.from}
              />
            </PopoverContent>
          </Popover>
        </div>
      </>
    )}
  </div>
);

// Summary cards component
const SummaryCards = ({ summaryStats }: { summaryStats: any }) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium">Total Started</CardTitle>
        <UsersIcon className="h-3 w-3 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{summaryStats.totalSessions}</div>
        <p className="text-xs text-muted-foreground">Games started</p>
      </CardContent>
    </Card>

    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium">Completions</CardTitle>
        <TargetIcon className="h-3 w-3 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{summaryStats.totalCompletions}</div>
        <p className="text-xs text-muted-foreground">Puzzles completed</p>
      </CardContent>
    </Card>

    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium">Completion Rate</CardTitle>
        <TrendingUpIcon className="h-3 w-3 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{summaryStats.completionRate}%</div>
        <p className="text-xs text-muted-foreground">Of started games</p>
      </CardContent>
    </Card>

    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium">Avg Time</CardTitle>
        <ClockIcon className="h-3 w-3 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{pretty_ms(summaryStats.avgTimeTaken * 1000)}s</div>
        <p className="text-xs text-muted-foreground">Per completion</p>
      </CardContent>
    </Card>

    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium">Avg Accuracy</CardTitle>
        <TargetIcon className="h-3 w-3 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{summaryStats.avgAccuracy}%</div>
        <p className="text-xs text-muted-foreground">per completetione</p>
      </CardContent>
    </Card>
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
  <div className="flex w-full items-center justify-between">
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-muted-foreground">View:</label>
      <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sessions-completions">Started and Completed</SelectItem>
          <SelectItem value="avg-time">Average Time</SelectItem>
          <SelectItem value="avg-accuracy">Average Accuracy</SelectItem>
          <SelectItem value="attempts">Total and Correct Attempts</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

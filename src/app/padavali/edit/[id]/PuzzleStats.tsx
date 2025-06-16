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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import { CalendarIcon, TrendingUpIcon, UsersIcon, ClockIcon, TargetIcon } from 'lucide-react';
import { cn } from '~/lib/utils';
import { format } from 'date-fns';
import { location_list_type } from '~/db/types';

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type PeriodType = 'last7days' | 'custom';

// Loading skeleton component
const StatsLoadingSkeleton = () => (
  <div className="space-y-6 p-6">
    {/* Header skeleton */}
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>

    {/* Controls skeleton */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-40" />
      </div>
    </div>

    {/* Summary cards skeleton */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Charts skeleton */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      ))}
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
                disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                initialFocus
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
                // disabled={(date) =>
                //   date > new Date() ||
                //   date < new Date('1900-01-01') ||
                //   (dateRange.from && date < dateRange.from)
                // }
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
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
        <UsersIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summaryStats.totalSessions}</div>
        <p className="text-xs text-muted-foreground">Game sessions started</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Completions</CardTitle>
        <TargetIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summaryStats.totalCompletions}</div>
        <p className="text-xs text-muted-foreground">Puzzles completed</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
        <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summaryStats.completionRate}%</div>
        <p className="text-xs text-muted-foreground">Of started sessions</p>
      </CardContent>
    </Card>
  </div>
);

// Charts section component
const ChartsSection = ({ chartData, chartConfig }: { chartData: any; chartConfig: any }) => (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    {/* Daily Activity Chart */}
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80">
          <BarChart data={chartData.dailyStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'MMM dd')} />
            <YAxis />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(value) => format(new Date(value as string), 'PPP')}
            />
            <Bar dataKey="sessions" fill="var(--color-sessions)" />
            <Bar dataKey="completions" fill="var(--color-completions)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>

    {/* Location Distribution Chart */}
    <Card>
      <CardHeader>
        <CardTitle>Sessions by Location</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80">
          <BarChart data={chartData.locationStats} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="location" type="category" width={100} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  </div>
);

// Main component
const PuzzleStats = ({ puzzleId }: { puzzleId: number }) => {
  const [period, setPeriod] = useState<PeriodType>('last7days');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
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
    if (!statsQuery.data) return { dailyStats: [], locationStats: [] };

    const { sessions, stats } = statsQuery.data;

    // Create daily aggregation
    const dailyMap = new Map<string, { date: string; sessions: number; completions: number }>();

    sessions.forEach((session) => {
      const dateKey = format(new Date(session.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(dateKey) || { date: dateKey, sessions: 0, completions: 0 };
      existing.sessions += 1;
      dailyMap.set(dateKey, existing);
    });

    stats.forEach((stat) => {
      const dateKey = format(new Date(stat.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(dateKey) || { date: dateKey, sessions: 0, completions: 0 };
      existing.completions += 1;
      dailyMap.set(dateKey, existing);
    });

    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Create location aggregation
    const locationMap = new Map<location_list_type, number>();
    sessions.forEach((session) => {
      const count = locationMap.get(session.location!) || 0;
      locationMap.set(session.location!, count + 1);
    });

    const locationStats = Array.from(locationMap.entries()).map(([location, count]) => ({
      location,
      count
    }));

    return { dailyStats, locationStats };
  }, [statsQuery.data]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!statsQuery.data) return null;

    const { sessions, stats } = statsQuery.data;

    return {
      totalSessions: sessions.length,
      totalCompletions: stats.length,
      completionRate: sessions.length > 0 ? Math.round((stats.length / sessions.length) * 100) : 0
    };
  }, [statsQuery.data]);

  const chartConfig = {
    sessions: {
      label: 'Sessions',
      color: 'hsl(var(--chart-1))'
    },
    completions: {
      label: 'Completions',
      color: 'hsl(var(--chart-2))'
    },
    count: {
      label: 'Count',
      color: 'hsl(var(--chart-3))'
    }
  };

  // Loading state
  if (statsQuery.isLoading) {
    return <StatsLoadingSkeleton />;
  }

  // Error state
  if (statsQuery.isError) {
    return (
      <div className="py-8 text-center">
        <div className="text-destructive">Failed to load statistics</div>
      </div>
    );
  }

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

      {/* Stats Content */}
      {statsQuery.isSuccess && summaryStats && (
        <>
          {/* Summary Cards */}
          <SummaryCards summaryStats={summaryStats} />

          {/* Charts */}
          <ChartsSection chartData={chartData} chartConfig={chartConfig} />

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

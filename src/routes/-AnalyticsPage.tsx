'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2Icon,
  ChartNoAxesCombinedIcon,
  PlayIcon,
  TrendingUpIcon,
  UserPlusIcon,
  UsersIcon
} from 'lucide-react';
import { useTRPC } from '~/api/client';
import type {
  AdminAnalyticsGameId,
  AdminAnalyticsGameRow,
  AdminAnalyticsTotals
} from '~/api/routers/analytics';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { GameAnalyticsMark } from '~/components/analytics/GameAnalyticsMark';
import {
  AnalyticsStatCardsSkeleton,
  AnalyticsStatGrid,
  type AnalyticsStat
} from '~/components/analytics/AnalyticsStatCards';
import {
  AnalyticsCustomRangePicker,
  AnalyticsPeriodSelect
} from '~/components/analytics/AnalyticsPeriodFilter';
import { useAnalyticsPeriod } from '~/components/analytics/analytics_period';
import { GameAnalyticsLinks } from '~/components/analytics/GameAnalyticsLinks';
import { TopPlayedLeader, type TopPlayedRow } from '~/components/analytics/TopPlayedLeader';
import { HubHeader } from '~/components/hub/HubHeader';
import { HUB_GAMES } from '~/components/hub/hub_games';
import { Card } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { cn } from '~/lib/utils';

type GameFilter = 'all' | AdminAnalyticsGameId;

/** Row shape returned by both `get_top_puzzles` procedures. */
type TopPlayedPuzzleRow = {
  puzzle_id: number;
  title: string;
  started: number;
  completed: number;
};

const GAME_ACCENT = {
  padavali: {
    wash: 'from-blue-50/90 via-sky-50/40 to-indigo-50/80 dark:from-blue-950/50 dark:via-slate-900/30 dark:to-indigo-950/40',
    ring: 'hover:ring-blue-400/55 dark:hover:ring-blue-500/45'
  },
  padajala: {
    wash: 'from-amber-50/90 via-orange-50/40 to-amber-50/80 dark:from-amber-950/50 dark:via-stone-900/30 dark:to-orange-950/40',
    ring: 'hover:ring-amber-400/55 dark:hover:ring-amber-500/45'
  },
  dvayi: {
    wash: 'from-rose-50/90 via-orange-50/40 to-amber-50/80 dark:from-rose-950/50 dark:via-slate-900/30 dark:to-orange-950/40',
    ring: 'hover:ring-rose-400/55 dark:hover:ring-rose-500/45'
  },
  bhramita: {
    wash: 'from-emerald-50/90 via-teal-50/40 to-cyan-50/80 dark:from-emerald-950/50 dark:via-slate-900/30 dark:to-teal-950/40',
    ring: 'hover:ring-emerald-400/55 dark:hover:ring-emerald-500/45'
  },
  surupa: {
    wash: 'from-violet-50/90 via-fuchsia-50/40 to-purple-50/80 dark:from-violet-950/50 dark:via-slate-900/30 dark:to-fuchsia-950/40',
    ring: 'hover:ring-violet-400/55 dark:hover:ring-violet-500/45'
  },
  anveshi: {
    wash: 'from-sky-50/90 via-indigo-50/40 to-blue-50/80 dark:from-sky-950/50 dark:via-slate-900/30 dark:to-indigo-950/40',
    ring: 'hover:ring-sky-400/55 dark:hover:ring-sky-500/45'
  }
} as const satisfies Record<AdminAnalyticsGameId, { wash: string; ring: string }>;

const GAME_PRESENTATION = {
  padavali: { name: HUB_GAMES.padavali.name },
  padajala: { name: HUB_GAMES.crossword.name },
  dvayi: { name: 'Dvayī' },
  bhramita: { name: 'Bhramitā' },
  surupa: { name: 'Surūpa' },
  anveshi: { name: 'Anveṣī' }
} as const satisfies Record<AdminAnalyticsGameId, { name: string }>;

const GAME_TABS = [
  { value: 'all', label: 'All games' },
  { value: 'padavali', label: HUB_GAMES.padavali.name },
  { value: 'padajala', label: HUB_GAMES.crossword.name },
  { value: 'dvayi', label: 'Dvayī' },
  { value: 'bhramita', label: 'Bhramitā' },
  { value: 'surupa', label: 'Surūpa' },
  { value: 'anveshi', label: 'Anveṣī' }
] as const;

function totalsStats(totals: AdminAnalyticsTotals): AnalyticsStat[] {
  return [
    {
      label: 'Total Started',
      value: totals.started.toLocaleString(),
      hint: 'Games started',
      icon: PlayIcon,
      accent: 'sky'
    },
    {
      label: 'Total Completed',
      value: totals.completed.toLocaleString(),
      hint: 'Games finished',
      icon: CheckCircle2Icon,
      accent: 'emerald'
    },
    {
      label: 'Completion Rate',
      value: `${totals.completion_rate}%`,
      hint: 'Of started games',
      icon: TrendingUpIcon,
      accent: 'violet'
    },
    {
      label: 'Signed-in Players',
      value: totals.signed_in_users.toLocaleString(),
      hint: 'Played while signed in',
      icon: UsersIcon,
      accent: 'fuchsia'
    },
    {
      label: 'New Sign-ins',
      value: totals.new_signed_in_users.toLocaleString(),
      hint: 'First ever play in range',
      icon: UserPlusIcon,
      accent: 'amber'
    }
  ];
}

function GameBreakdownCard({ row }: { row: AdminAnalyticsGameRow }) {
  const presentation = GAME_PRESENTATION[row.game];
  const accent = GAME_ACCENT[row.game];
  const metrics = [
    { label: 'Started', value: row.started.toLocaleString() },
    { label: 'Completed', value: row.completed.toLocaleString() },
    { label: 'Rate', value: `${row.completion_rate}%` },
    { label: 'Signed-in', value: row.signed_in_users.toLocaleString() },
    { label: 'New sign-ins', value: row.new_signed_in_users.toLocaleString() }
  ];

  return (
    <Card
      className={cn(
        'overflow-hidden bg-linear-to-br ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:ring-white/10',
        accent.wash,
        accent.ring
      )}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <GameAnalyticsMark game={row.game} name={presentation.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight">{presentation.name}</p>
          <p className="truncate text-xs text-muted-foreground">Per-game breakdown</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-black/5 px-3 py-3 sm:grid-cols-5 sm:px-4 dark:border-white/10">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <dt className="truncate text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
              {metric.label}
            </dt>
            <dd className="text-base leading-tight font-bold tabular-nums sm:text-lg">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function BreakdownSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={`analytics-game-skeleton-${index}`} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}
export default function AnalyticsPage() {
  const [game, setGame] = useState<GameFilter>('all');
  const period = useAnalyticsPeriod('last_month');
  const trpc = useTRPC();

  const rangeInput = {
    all_time: period.allTime,
    start_date: period.effectiveRange?.from,
    end_date: period.effectiveRange?.to
  };

  const overviewQuery = useQuery(
    trpc.analytics.get_overview.queryOptions({ game, ...rangeInput }, { enabled: period.isReady })
  );

  const showPadavali = game === 'all' || game === 'padavali';
  const showPadajala = game === 'all' || game === 'padajala';
  const showDvayi = game === 'all' || game === 'dvayi';
  const showBhramita = game === 'all' || game === 'bhramita';
  const showSurupa = game === 'all' || game === 'surupa';
  const showAnveshi = game === 'all' || game === 'anveshi';

  const topPadavaliQuery = useQuery(
    trpc.puzzle.stats.get_top_puzzles.queryOptions(
      { ...rangeInput, limit: 10 },
      { enabled: showPadavali && period.isReady }
    )
  );

  const topPadajalaQuery = useQuery(
    trpc.crossword.stats.get_top_puzzles.queryOptions(
      { ...rangeInput, limit: 10 },
      { enabled: showPadajala && period.isReady }
    )
  );

  const topDvayiQuery = useQuery(
    trpc.dvayi.stats.get_top_puzzles.queryOptions(
      { ...rangeInput, limit: 10 },
      { enabled: showDvayi && period.isReady }
    )
  );
  const topBhramitaQuery = useQuery(
    trpc.bhramita.stats.get_top_puzzles.queryOptions(
      { ...rangeInput, limit: 10 },
      { enabled: showBhramita && period.isReady }
    )
  );
  const topSurupaQuery = useQuery(
    trpc.surupa.stats.get_top_puzzles.queryOptions(
      { ...rangeInput, limit: 10 },
      { enabled: showSurupa && period.isReady }
    )
  );
  const topAnveshiQuery = useQuery(
    trpc.anveshi.stats.get_top_puzzles.queryOptions(
      { ...rangeInput, limit: 10 },
      { enabled: showAnveshi && period.isReady }
    )
  );

  const games = overviewQuery.data?.games ?? [];
  const totals = overviewQuery.data?.totals;

  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <ChartNoAxesCombinedIcon className="size-5 shrink-0 text-blue-600 dark:text-blue-400" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Play volume and signed-in players across every catalog game.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <Tabs
            value={game}
            onValueChange={(value) => {
              const tab = GAME_TABS.find((item) => item.value === value);
              if (tab) setGame(tab.value);
            }}
            className="min-w-0"
          >
            <TabsList className="w-full justify-start sm:w-fit">
              {GAME_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <AnalyticsPeriodSelect period={period.period} onPeriodChange={period.setPeriod} />
        </div>

        {period.period === 'custom' ? (
          <AnalyticsCustomRangePicker
            dateRange={period.dateRange}
            onDateRangeChange={period.setDateRange}
          />
        ) : null}

        {overviewQuery.isLoading ? (
          <div className="flex flex-col gap-4">
            <AnalyticsStatCardsSkeleton />
            <BreakdownSkeleton count={game === 'all' ? 6 : 1} />
          </div>
        ) : null}
        {overviewQuery.isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Failed to load analytics overview
          </p>
        ) : null}

        {totals ? (
          <div className="flex flex-col gap-4">
            <AnalyticsStatGrid stats={totalsStats(totals)} />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {games.map((row) => (
                <GameBreakdownCard key={row.game} row={row} />
              ))}
            </div>

            <GameAnalyticsLinks
              rows={games.map((row) => ({
                game: row.game,
                started: row.started,
                completed: row.completed
              }))}
            />

            {showPadavali ? (
              <TopPlayedLeader
                variant="puzzles"
                accordionValue="central-top-padavali"
                title="Top Played — Padāvalī"
                subtitle="Top 10 by plays"
                emptyMessage="No Padāvalī plays in this period"
                isLoading={topPadavaliQuery.isLoading}
                items={toTopPlayedRows(topPadavaliQuery.data?.puzzles ?? [])}
              />
            ) : null}

            {showPadajala ? (
              <TopPlayedLeader
                variant="puzzles"
                accordionValue="central-top-padajala"
                title="Top Played — Padajāla"
                subtitle="Top 10 by plays"
                emptyMessage="No Padajāla plays in this period"
                isLoading={topPadajalaQuery.isLoading}
                items={toTopPlayedRows(topPadajalaQuery.data?.puzzles ?? [])}
              />
            ) : null}
            {showDvayi ? (
              <TopPlayedLeader
                variant="puzzles"
                accordionValue="central-top-dvayi"
                title="Top Played — Dvayī"
                subtitle="Top 10 by plays"
                emptyMessage="No Dvayī plays in this period"
                isLoading={topDvayiQuery.isLoading}
                items={toTopPlayedRows(topDvayiQuery.data?.puzzles ?? [])}
              />
            ) : null}
            {showBhramita ? (
              <TopPlayedLeader
                variant="puzzles"
                accordionValue="central-top-bhramita"
                title="Top Played — Bhramitā"
                subtitle="Top 10 by plays"
                emptyMessage="No Bhramitā plays in this period"
                isLoading={topBhramitaQuery.isLoading}
                items={toTopPlayedRows(topBhramitaQuery.data?.puzzles ?? [])}
              />
            ) : null}
            {showSurupa ? (
              <TopPlayedLeader
                variant="puzzles"
                accordionValue="central-top-surupa"
                title="Top Played — Surūpa"
                subtitle="Top 10 by plays"
                emptyMessage="No Surūpa plays in this period"
                isLoading={topSurupaQuery.isLoading}
                items={toTopPlayedRows(topSurupaQuery.data?.puzzles ?? [])}
              />
            ) : null}
            {showAnveshi ? (
              <TopPlayedLeader
                variant="puzzles"
                accordionValue="central-top-anveshi"
                title="Top Played — Anveṣī"
                subtitle="Top 10 by plays"
                emptyMessage="No Anveṣī plays in this period"
                isLoading={topAnveshiQuery.isLoading}
                items={toTopPlayedRows(topAnveshiQuery.data?.puzzles ?? [])}
              />
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function toTopPlayedRows(puzzles: TopPlayedPuzzleRow[]): TopPlayedRow[] {
  return puzzles.map((puzzle) => ({
    id: String(puzzle.puzzle_id),
    title: puzzle.title,
    started: puzzle.started,
    completed: puzzle.completed
  }));
}

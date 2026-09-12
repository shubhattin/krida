'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ArrowRight, BookOpen, Play } from 'lucide-react';
import pretty_ms from 'pretty-ms';
import { useTRPC } from '~/api/client';
import type { DashboardGameId, GameDashboardStats } from '~/api/user_dashboard';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { GameAppIcon } from '~/components/GameAppIcon';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useSession } from '~/lib/auth-client';
import { robotoSans } from '~/components/fonts';
import { cn } from '~/lib/utils';

type GameFilter = 'all' | DashboardGameId;

function formatSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  return pretty_ms(Math.round(seconds) * 1000, { secondsDecimalDigits: 0 });
}

function formatAccuracy(accuracy: number | null | undefined): string {
  if (accuracy == null || !Number.isFinite(accuracy)) return '—';
  return `${Math.round(accuracy)}%`;
}

function formatPlayedAt(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM d, yyyy');
}

function DashboardPage() {
  const [game, setGame] = useState<GameFilter>('all');
  const userName = useSession().data?.user?.name;
  const trpc = useTRPC();
  const dashboardQuery = useQuery(trpc.user.get_dashboard.queryOptions({ game }));

  return (
    <div className="min-h-screen bg-background">
      <header className="w-full border-b border-slate-200/60 bg-linear-to-r from-white via-slate-50 to-blue-50 shadow-lg backdrop-blur-sm dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 lg:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-3 no-underline">
            <div className="flex items-center gap-1.5">
              <GameAppIcon game="padavali" name="Padāvalī" size="sm" className="rounded-xl" />
              <GameAppIcon game="padajala" name="Padajāla" size="sm" className="rounded-xl" />
            </div>
            <div className="min-w-0">
              <h1
                className={cn(
                  'bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-2xl font-bold text-transparent',
                  'transition-all duration-200 group-hover:from-blue-600 group-hover:to-indigo-500',
                  'dark:from-slate-100 dark:to-slate-300 dark:group-hover:from-blue-400 dark:group-hover:to-indigo-300',
                  robotoSans.className
                )}
              >
                Dashboard
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Your play stats</p>
            </div>
          </Link>
          <MenuButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {userName ? `Hi, ${userName}` : 'Your games'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Combined Padāvalī and Padajāla stats from your signed-in plays.
          </p>
        </div>

        <GameLinks />

        <Tabs
          value={game}
          onValueChange={(value) => {
            if (value === 'all' || value === 'padavali' || value === 'padajala') {
              setGame(value);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All games</TabsTrigger>
            <TabsTrigger value="padavali">Padāvalī</TabsTrigger>
            <TabsTrigger value="padajala">Padajāla</TabsTrigger>
          </TabsList>
        </Tabs>

        {dashboardQuery.isLoading ? <DashboardSkeleton /> : null}
        {dashboardQuery.isError ? (
          <p className="py-8 text-center text-sm text-destructive">Failed to load dashboard stats</p>
        ) : null}
        {dashboardQuery.data ? (
          <div className="flex flex-col gap-6">
            <TotalsRow
              started={dashboardQuery.data.totals.started}
              completed={dashboardQuery.data.totals.completed}
              completionRate={dashboardQuery.data.totals.completion_rate}
              bestTime={dashboardQuery.data.totals.best_time_seconds}
              bestAccuracy={dashboardQuery.data.totals.best_accuracy}
            />
            <div
              className={cn(
                'grid grid-cols-1 gap-4',
                game === 'all' ? 'md:grid-cols-2' : 'md:grid-cols-1'
              )}
            >
              {game !== 'padajala' ? (
                <GameStatsCard game="padavali" stats={dashboardQuery.data.padavali} />
              ) : null}
              {game !== 'padavali' ? (
                <GameStatsCard game="padajala" stats={dashboardQuery.data.padajala} />
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function GameLinks() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <GameLinkCard
        game="padavali"
        name="Padāvalī"
        subtitle="Word Search"
        playTo="/padavali"
        puzzlesTo="/padavali/puzzles"
      />
      <GameLinkCard
        game="padajala"
        name="Padajāla"
        subtitle="Crossword"
        playTo="/padajala"
        puzzlesTo="/padajala/puzzles"
      />
    </div>
  );
}

function GameLinkCard({
  game,
  name,
  subtitle,
  playTo,
  puzzlesTo
}: {
  game: DashboardGameId;
  name: string;
  subtitle: string;
  playTo: '/padavali' | '/padajala';
  puzzlesTo: '/padavali/puzzles' | '/padajala/puzzles';
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <GameAppIcon game={game} name={name} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          render={<Link to={playTo} className="inline-flex flex-1 items-center justify-center gap-1.5" />}
          nativeButton={false}
          size="sm"
          className="flex-1"
        >
          <Play data-icon="inline-start" />
          Play
          <ArrowRight data-icon="inline-end" />
        </Button>
        <Button
          render={
            <Link to={puzzlesTo} className="inline-flex flex-1 items-center justify-center gap-1.5" />
          }
          nativeButton={false}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          <BookOpen data-icon="inline-start" />
          Puzzles
        </Button>
      </div>
    </div>
  );
}

function TotalsRow({
  started,
  completed,
  completionRate,
  bestTime,
  bestAccuracy
}: {
  started: number;
  completed: number;
  completionRate: number;
  bestTime: number | null;
  bestAccuracy: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <StatCard label="Started" value={String(started)} />
      <StatCard label="Completed" value={String(completed)} />
      <StatCard label="Finish rate" value={`${completionRate}%`} />
      <StatCard label="Best time" value={formatSeconds(bestTime)} />
      <StatCard label="Best accuracy" value={formatAccuracy(bestAccuracy)} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function GameStatsCard({ game, stats }: { game: DashboardGameId; stats: GameDashboardStats }) {
  const name = game === 'padavali' ? 'Padāvalī' : 'Padajāla';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <GameAppIcon game={game} name={name} size="sm" />
          <div className="min-w-0">
            <CardTitle>{name}</CardTitle>
            <CardDescription>
              {stats.started} started · {stats.completed} completed
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground">Avg time</span>
            <span className="font-medium tabular-nums">{formatSeconds(stats.avg_time_seconds)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground">Avg accuracy</span>
            <span className="font-medium tabular-nums">{formatAccuracy(stats.avg_accuracy)}</span>
          </div>
        </div>

        <PuzzleList
          title="Most played"
          empty="No plays yet"
          items={stats.top_puzzles.map((puzzle) => ({
            key: `${game}-top-${puzzle.puzzle_id}`,
            game,
            slug: puzzle.slug,
            title: puzzle.title,
            meta: `${puzzle.completed}/${puzzle.started} · best ${formatSeconds(puzzle.best_time_seconds)}`
          }))}
        />
        <PuzzleList
          title="Recent completions"
          empty="No completions yet"
          items={stats.recent.map((row, index) => ({
            key: `${game}-recent-${row.puzzle_id}-${index}`,
            game,
            slug: row.slug,
            title: row.title,
            meta: `${formatSeconds(row.time_taken)} · ${formatAccuracy(row.accuracy)} · ${formatPlayedAt(row.created_at)}`
          }))}
        />
      </CardContent>
    </Card>
  );
}

function PuzzleList({
  title,
  empty,
  items
}: {
  title: string;
  empty: string;
  items: Array<{
    key: string;
    game: DashboardGameId;
    slug: string;
    title: string;
    meta: string;
  }>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.key}>
              <PuzzleTitleLink game={item.game} slug={item.slug}>
                <span className="truncate font-medium">{item.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.meta}</span>
              </PuzzleTitleLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PuzzleTitleLink({
  game,
  slug,
  children
}: {
  game: DashboardGameId;
  slug: string;
  children: ReactNode;
}) {
  const className =
    'flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm no-underline transition-colors hover:bg-muted';

  if (game === 'padavali') {
    return (
      <Link to="/padavali/$slug" params={{ slug }} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <Link to="/padajala/$slug" params={{ slug }} className={className}>
      {children}
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={`dash-stat-${index}`} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default DashboardPage;

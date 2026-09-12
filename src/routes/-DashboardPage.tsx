'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Percent,
  Play,
  Target
} from 'lucide-react';
import pretty_ms from 'pretty-ms';
import { useTRPC } from '~/api/client';
import type { DashboardGameId, GameDashboardStats } from '~/api/user_dashboard';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { GameAppIcon } from '~/components/GameAppIcon';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useSession } from '~/lib/auth-client';
import { robotoSans } from '~/components/fonts';
import { cn } from '~/lib/utils';

type GameFilter = 'all' | DashboardGameId;

const GAME_CHROME = {
  padavali: {
    card: 'hover:ring-blue-400/55 dark:hover:ring-blue-500/45',
    play: 'from-blue-500 to-indigo-600 shadow-blue-500/35 hover:from-blue-400 hover:to-indigo-500',
    wash: 'from-blue-50/90 via-sky-50/40 to-indigo-50/80 dark:from-blue-950/50 dark:via-slate-900/30 dark:to-indigo-950/40'
  },
  padajala: {
    card: 'hover:ring-amber-400/55 dark:hover:ring-amber-500/45',
    play: 'from-amber-500 to-orange-600 shadow-amber-500/35 hover:from-amber-400 hover:to-orange-500',
    wash: 'from-amber-50/90 via-orange-50/40 to-amber-50/80 dark:from-amber-950/50 dark:via-stone-900/30 dark:to-orange-950/40'
  }
} as const;

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
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/30 transition-transform duration-200 group-hover:scale-105">
              <LayoutDashboard className="size-4" />
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
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Your play stats
              </p>
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
          <p className="py-8 text-center text-sm text-destructive">
            Failed to load dashboard stats
          </p>
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
  const chrome = GAME_CHROME[game];

  return (
    <Card
      size="sm"
      className={cn(
        'bg-linear-to-br transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        chrome.wash,
        chrome.card
      )}
    >
      <CardHeader className="items-center">
        <div className="flex min-w-0 items-center gap-2.5">
          <GameAppIcon game={game} name={name} size="sm" />
          <div className="min-w-0">
            <CardTitle className="truncate">{name}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
        </div>
        <CardAction className="flex items-center gap-1.5 self-center">
          <Button
            render={<Link to={playTo} />}
            nativeButton={false}
            size="sm"
            className={cn(
              'border-transparent bg-linear-to-r text-white shadow-md',
              'transition-all duration-200 hover:-translate-y-px hover:text-white hover:shadow-lg',
              chrome.play
            )}
          >
            <Play data-icon="inline-start" className="fill-white" />
            Play
          </Button>
          <Button
            render={<Link to={puzzlesTo} />}
            nativeButton={false}
            size="sm"
            variant="outline"
            className="bg-background/70 transition-all duration-200 hover:-translate-y-px"
          >
            <BookOpen data-icon="inline-start" />
            Puzzles
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
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
      <StatCard
        label="Started"
        value={String(started)}
        icon={<Play className="size-3.5 fill-white" />}
        iconClass="from-sky-500 to-blue-600 shadow-sky-500/25"
      />
      <StatCard
        label="Completed"
        value={String(completed)}
        icon={<CheckCircle2 className="size-3.5" />}
        iconClass="from-emerald-500 to-teal-600 shadow-emerald-500/25"
      />
      <StatCard
        label="Completion rate"
        value={`${completionRate}%`}
        icon={<Percent className="size-3.5" />}
        iconClass="from-violet-500 to-indigo-600 shadow-violet-500/25"
      />
      <StatCard
        label="Best time"
        value={formatSeconds(bestTime)}
        icon={<Clock3 className="size-3.5" />}
        iconClass="from-amber-500 to-orange-600 shadow-amber-500/25"
      />
      <StatCard
        label="Best accuracy"
        value={formatAccuracy(bestAccuracy)}
        icon={<Target className="size-3.5" />}
        iconClass="from-fuchsia-500 to-pink-600 shadow-fuchsia-500/25"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconClass
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <Card size="sm" className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white shadow-sm',
              iconClass
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <CardDescription>{label}</CardDescription>
            <CardTitle className="tabular-nums">{value}</CardTitle>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function GameStatsCard({ game, stats }: { game: DashboardGameId; stats: GameDashboardStats }) {
  const name = game === 'padavali' ? 'Padāvalī' : 'Padajāla';
  const chrome = GAME_CHROME[game];

  return (
    <Card
      className={cn(
        'overflow-hidden bg-linear-to-br transition-all duration-300 hover:shadow-md',
        chrome.wash,
        chrome.card
      )}
    >
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
            <span className="font-medium tabular-nums">
              {formatSeconds(stats.avg_time_seconds)}
            </span>
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
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {item.meta}
                </span>
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
    'flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm no-underline transition-all duration-200 hover:translate-x-0.5 hover:bg-muted';

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

'use client';

import { useId, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouteContext } from '@tanstack/react-router';
import { formatDistanceToNowStrict } from 'date-fns';
import { CheckCircle2, Clock3, Flame, Play, Sparkles, Target, Trophy } from 'lucide-react';
import pretty_ms from 'pretty-ms';
import { useTRPC } from '~/api/client';
import type {
  CombinedDashboardTotals,
  DashboardGameId,
  GameDashboardStats
} from '~/api/routers/user/user_dashboard';
import { GAME_KINDS, isGameKind, type GameKind } from '~/util/catalog/tags';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { EditDisplayNameDialog } from '~/components/pages/dashboard/EditDisplayNameDialog';
import { GameAppIcon } from '~/components/GameAppIcon';
import { HubHeader } from '~/components/hub/HubHeader';
import { HUB_GAME_ACCENT, HUB_GAMES } from '~/components/hub/hub_games';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useSession } from '~/lib/auth-client';
import { GoogleIcon } from '~/components/icons';
import Icon from '~/tools/Icon';
import { startGoogleSignIn } from '~/lib/google_sign_in';
import { useGuestPlayCount } from '~/components/app-bar/useClaimGuestPlays';
import { cn } from '~/lib/utils';

type GameFilter = 'all' | DashboardGameId;

const GAME_CHROME = {
  padavali: {
    wash: 'from-blue-500/12 via-sky-500/5 to-transparent dark:from-blue-500/20 dark:via-indigo-500/8',
    ring: 'stroke-blue-500',
    soft: 'bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    dot: 'bg-blue-500',
    play: 'from-blue-500 to-indigo-600 shadow-blue-500/30 hover:from-blue-400 hover:to-indigo-500'
  },
  padajala: {
    wash: 'from-amber-500/14 via-orange-500/5 to-transparent dark:from-amber-500/20 dark:via-orange-500/8',
    ring: 'stroke-amber-500',
    soft: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    dot: 'bg-amber-500',
    play: 'from-amber-500 to-orange-600 shadow-amber-500/30 hover:from-amber-400 hover:to-orange-500'
  },
  dvayi: {
    wash: 'from-rose-500/12 via-orange-500/5 to-transparent dark:from-rose-500/20 dark:via-orange-500/8',
    ring: 'stroke-rose-500',
    soft: 'bg-rose-500/10 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300',
    dot: 'bg-rose-500',
    play: 'from-rose-500 to-orange-600 shadow-rose-500/30 hover:from-rose-400 hover:to-orange-500'
  },
  bhramita: {
    wash: 'from-emerald-500/12 via-teal-500/5 to-transparent dark:from-emerald-500/20 dark:via-teal-500/8',
    ring: 'stroke-emerald-500',
    soft: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    play: 'from-emerald-500 to-teal-600 shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-500'
  },
  surupa: {
    wash: 'from-violet-500/12 via-fuchsia-500/5 to-transparent dark:from-violet-500/20 dark:via-fuchsia-500/8',
    ring: 'stroke-violet-500',
    soft: 'bg-violet-500/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
    dot: 'bg-violet-500',
    play: 'from-violet-500 to-fuchsia-600 shadow-violet-500/30 hover:from-violet-400 hover:to-fuchsia-500'
  },
  anveshi: {
    wash: 'from-sky-500/12 via-indigo-500/5 to-transparent dark:from-sky-500/20 dark:via-indigo-500/8',
    ring: 'stroke-sky-500',
    soft: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
    dot: 'bg-sky-500',
    play: 'from-sky-500 to-indigo-600 shadow-sky-500/30 hover:from-sky-400 hover:to-indigo-500'
  }
} as const;

const surfaceClass =
  'rounded-2xl border border-slate-200/80 bg-white/75 shadow-sm backdrop-blur-md dark:border-white/8 dark:bg-slate-900/55';

function formatSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  return pretty_ms(Math.round(seconds) * 1000, { secondsDecimalDigits: 0 });
}

function formatAccuracy(accuracy: number | null | undefined): string {
  if (accuracy == null || !Number.isFinite(accuracy)) return '—';
  return `${Math.round(accuracy)}%`;
}

function formatPlayedAgo(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

function accuracyTone(accuracy: number): string {
  if (accuracy >= 90) return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
  if (accuracy >= 70) return 'bg-amber-500/12 text-amber-700 dark:text-amber-300';
  return 'bg-rose-500/12 text-rose-700 dark:text-rose-300';
}

function initialsFromName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
}

function DashboardPage() {
  const { session } = useRouteContext({ from: '/dashboard' });
  const liveUser = useSession().data?.user;
  if (!session?.user && !liveUser) return <GuestDashboard />;
  return <SignedInDashboard />;
}

function SignedInDashboard() {
  const [game, setGame] = useState<GameFilter>('all');
  const user = useSession().data?.user;
  const trpc = useTRPC();
  const dashboardQuery = useQuery(trpc.user.get_dashboard.queryOptions({ game }));
  const data = dashboardQuery.data;
  const games: DashboardGameId[] = game === 'all' ? [...GAME_KINDS] : [game];

  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6 lg:px-6 lg:py-8">
        <Hero name={user?.name} image={user?.image} totals={data?.totals} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Your stats</h3>
          <Tabs
            value={game}
            onValueChange={(value) => {
              if (value === 'all' || isGameKind(value)) {
                setGame(value);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="all">All games</TabsTrigger>
              {GAME_KINDS.map((kind: GameKind) => (
                <TabsTrigger key={kind} value={kind}>
                  {HUB_GAMES[kind].name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {dashboardQuery.isLoading ? <DashboardSkeleton /> : null}
        {dashboardQuery.isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Failed to load dashboard stats
          </p>
        ) : null}
        {data ? (
          <>
            <KpiGrid totals={data.totals} />
            <div className={cn('grid grid-cols-1 gap-4', games.length > 1 && 'lg:grid-cols-2')}>
              {games.map((id) => (
                <GamePanel key={id} game={id} stats={data[id]} wide={games.length === 1} />
              ))}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

/** Illustrative numbers behind the blur — never real data. */
const PREVIEW_TOTALS: CombinedDashboardTotals = {
  started: 24,
  completed: 19,
  completion_rate: 79,
  best_time_seconds: 104,
  best_accuracy: 96
};

function GuestDashboard() {
  const guestCompleted = useGuestPlayCount();
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6 lg:px-6 lg:py-8">
        <section
          className={cn(
            surfaceClass,
            'relative overflow-hidden bg-linear-to-br from-violet-500/10 via-transparent to-blue-500/10 p-5 sm:p-6 dark:from-violet-500/15 dark:to-blue-500/10'
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-500/15"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                <Sparkles className="size-3.5" />
                Your dashboard
              </p>
              <h2 className="text-xl font-bold tracking-tight sm:text-3xl">
                Track every puzzle you solve
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {guestCompleted > 0
                  ? `You've solved ${guestCompleted} puzzle${guestCompleted === 1 ? '' : 's'} as a guest on this device. Sign in to save ${guestCompleted === 1 ? 'it' : 'them'} to your stats.`
                  : 'Sign in to see your best times, accuracy and progress across every game.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="shrink-0 self-start sm:self-auto"
              onClick={() => void startGoogleSignIn('dashboard')}
            >
              <span data-icon="inline-start">
                <Icon src={GoogleIcon} />
              </span>
              Continue with Google
            </Button>
          </div>
        </section>

        <div aria-hidden className="pointer-events-none relative select-none">
          <div className="opacity-60 blur-[3px]">
            <KpiGrid totals={PREVIEW_TOTALS} />
          </div>
          <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
            Your stats appear here after you sign in
          </p>
        </div>
      </main>
    </div>
  );
}

function Hero({
  name,
  image,
  totals
}: {
  name: string | null | undefined;
  image: string | null | undefined;
  totals: CombinedDashboardTotals | undefined;
}) {
  const firstName = name?.trim().split(/\s+/)[0];
  const subtitle = !totals
    ? 'Loading your progress…'
    : totals.started === 0
      ? 'Your first puzzle is waiting. Pick a game below and start playing.'
      : totals.completed === 0
        ? `You've started ${totals.started} puzzle${totals.started === 1 ? '' : 's'}. Finish one to set your first best time.`
        : `${totals.completed} of ${totals.started} puzzles solved. Keep the streak going.`;

  return (
    <section
      className={cn(
        surfaceClass,
        'relative overflow-hidden bg-linear-to-br from-violet-500/10 via-transparent to-blue-500/10 p-5 sm:p-6 dark:from-violet-500/15 dark:to-blue-500/10'
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-500/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-500/10"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Avatar className="size-12 shrink-0 ring-2 ring-white/70 sm:size-14 dark:ring-white/10">
            {image ? <AvatarImage src={image} alt="" /> : null}
            <AvatarFallback className="bg-linear-to-br from-violet-500 to-indigo-600 text-lg font-semibold text-white">
              {initialsFromName(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300">
              <Sparkles className="size-3.5" />
              Your dashboard
            </p>
            <div className="flex min-w-0 items-center gap-1">
              <h2 className="truncate text-xl font-bold tracking-tight sm:text-3xl">
                {firstName ? `Namaste, ${firstName}` : 'Your games'}
              </h2>
              <EditDisplayNameDialog name={name} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {totals ? (
          <div className="flex items-center gap-4 self-start sm:self-auto">
            <CompletionRing percent={totals.completion_rate} />
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-semibold tabular-nums">
                {totals.completed}
                <span className="font-normal text-muted-foreground"> / {totals.started}</span>
              </span>
              <span className="text-xs text-muted-foreground">puzzles solved</span>
            </div>
          </div>
        ) : (
          <Skeleton className="size-20 rounded-full" />
        )}
      </div>
    </section>
  );
}

function CompletionRing({ percent }: { percent: number }) {
  const gradientId = useId();
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="7"
          className="stroke-slate-200 dark:stroke-white/10"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">
        {clamped}%
      </span>
    </div>
  );
}

function KpiGrid({ totals }: { totals: CombinedDashboardTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiTile
        label="Puzzles played"
        value={String(totals.started)}
        icon={<Flame className="size-3.5" />}
        iconClass="from-sky-500 to-blue-600 shadow-sky-500/30"
      />
      <KpiTile
        label="Solved"
        value={String(totals.completed)}
        icon={<CheckCircle2 className="size-3.5" />}
        iconClass="from-emerald-500 to-teal-600 shadow-emerald-500/30"
      />
      <KpiTile
        label="Fastest solve"
        value={formatSeconds(totals.best_time_seconds)}
        icon={<Clock3 className="size-3.5" />}
        iconClass="from-amber-500 to-orange-600 shadow-amber-500/30"
      />
      <KpiTile
        label="Best accuracy"
        value={formatAccuracy(totals.best_accuracy)}
        icon={<Target className="size-3.5" />}
        iconClass="from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30"
      />
    </div>
  );
}

function KpiTile({
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
    <div className={cn(surfaceClass, 'flex flex-col gap-2 px-4 py-3.5')}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <div
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white shadow-md',
            iconClass
          )}
        >
          {icon}
        </div>
      </div>
      <p className="truncate text-2xl font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function GamePanel({
  game,
  stats,
  wide
}: {
  game: DashboardGameId;
  stats: GameDashboardStats;
  wide: boolean;
}) {
  const meta = HUB_GAMES[game];
  const chrome = GAME_CHROME[game];
  const completion = stats.started > 0 ? Math.round((stats.completed / stats.started) * 100) : 0;

  return (
    <section className={cn(surfaceClass, 'flex flex-col overflow-hidden')}>
      <header
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 bg-linear-to-br px-4 py-4 sm:px-5',
          chrome.wash
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <GameAppIcon game={meta.kind} name={meta.name} size="sm" />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight">{meta.name}</h3>
            <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>
        <Button
          render={<Link to="/puzzles" search={{ game: meta.kind }} />}
          nativeButton={false}
          size="sm"
          className={cn(
            'border-transparent bg-linear-to-r text-white shadow-md transition-all duration-200 hover:-translate-y-px hover:text-white hover:shadow-lg',
            chrome.play
          )}
        >
          <Play data-icon="inline-start" className="fill-white" />
          Play
        </Button>
      </header>

      {stats.started === 0 ? (
        <EmptyGame game={game} />
      ) : (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2">
            <MiniMetric
              label="Solved"
              value={`${stats.completed}/${stats.started}`}
              bar={completion}
              barClass={HUB_GAME_ACCENT[game].gradient}
            />
            <MiniMetric label="Avg time" value={formatSeconds(stats.avg_time_seconds)} />
            <MiniMetric
              label="Avg accuracy"
              value={formatAccuracy(stats.avg_accuracy)}
              bar={stats.avg_accuracy ?? undefined}
              barClass="from-emerald-500 to-teal-500"
            />
          </div>

          <div className={cn('grid grid-cols-1 gap-5', wide && 'md:grid-cols-2')}>
            <ListSection title="Most played" icon={<Trophy className="size-3.5" />}>
              {stats.top_puzzles.length === 0 ? (
                <EmptyLine>No plays yet</EmptyLine>
              ) : (
                <ol className="flex flex-col gap-1">
                  {stats.top_puzzles.map((puzzle, index) => {
                    const solved =
                      puzzle.started > 0
                        ? Math.round((puzzle.completed / puzzle.started) * 100)
                        : 0;
                    return (
                      <li key={`${game}-top-${puzzle.puzzle_id}`}>
                        <PuzzleLink game={game} slug={puzzle.slug}>
                          <span
                            className={cn(
                              'flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums',
                              chrome.soft
                            )}
                          >
                            {index + 1}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="truncate font-medium">{puzzle.title}</span>
                            <span className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                              <span
                                className={cn(
                                  'block h-full rounded-full bg-linear-to-r',
                                  HUB_GAME_ACCENT[game].gradient
                                )}
                                style={{ width: `${solved}%` }}
                              />
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end text-xs tabular-nums">
                            <span className="font-medium">
                              {puzzle.completed}/{puzzle.started}
                            </span>
                            <span className="text-muted-foreground">
                              {formatSeconds(puzzle.best_time_seconds)}
                            </span>
                          </span>
                        </PuzzleLink>
                      </li>
                    );
                  })}
                </ol>
              )}
            </ListSection>

            <ListSection title="Recent solves" icon={<Clock3 className="size-3.5" />}>
              {stats.recent.length === 0 ? (
                <EmptyLine>No completions yet — finish a puzzle to see it here</EmptyLine>
              ) : (
                <ul className="relative flex flex-col gap-1 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-px before:bg-slate-200 dark:before:bg-white/10">
                  {stats.recent.map((row, index) => (
                    <li key={`${game}-recent-${row.puzzle_id}-${index}`}>
                      <PuzzleLink game={game} slug={row.slug}>
                        <span className="relative flex size-6 shrink-0 items-center justify-center">
                          <span
                            className={cn(
                              'size-2.5 rounded-full ring-4 ring-white dark:ring-slate-900',
                              chrome.dot
                            )}
                          />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">{row.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatPlayedAgo(row.created_at)} · {formatSeconds(row.time_taken)}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                            accuracyTone(row.accuracy)
                          )}
                        >
                          {formatAccuracy(row.accuracy)}
                        </span>
                      </PuzzleLink>
                    </li>
                  ))}
                </ul>
              )}
            </ListSection>
          </div>
        </div>
      )}
    </section>
  );
}

function MiniMetric({
  label,
  value,
  bar,
  barClass
}: {
  label: string;
  value: string;
  bar?: number;
  barClass?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-slate-100/80 px-3 py-2.5 dark:bg-white/5">
      <span className="truncate text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="truncate text-base font-semibold tabular-nums">{value}</span>
      {bar != null ? (
        <span className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <span
            className={cn('block h-full rounded-full bg-linear-to-r', barClass)}
            style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
          />
        </span>
      ) : null}
    </div>
  );
}

function ListSection({
  title,
  icon,
  children
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300/80 px-3 py-4 text-center text-sm text-muted-foreground dark:border-white/10">
      {children}
    </p>
  );
}

function EmptyGame({ game }: { game: DashboardGameId }) {
  const meta = HUB_GAMES[game];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="relative">
        <div
          aria-hidden
          className={cn('absolute inset-0 rounded-full blur-2xl', HUB_GAME_ACCENT[game].glow)}
        />
        <GameAppIcon game={meta.kind} name={meta.name} size="lg" className="relative" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-semibold">No {meta.name} plays yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">{meta.description}</p>
      </div>
      <Button
        render={<Link to="/puzzles" search={{ game: meta.kind }} />}
        nativeButton={false}
        size="sm"
        className={cn(
          'mt-1 border-transparent bg-linear-to-r text-white shadow-md hover:text-white',
          GAME_CHROME[game].play
        )}
      >
        <Play data-icon="inline-start" className="fill-white" />
        Play your first puzzle
      </Button>
    </div>
  );
}

function PuzzleLink({
  game,
  slug,
  children
}: {
  game: DashboardGameId;
  slug: string;
  children: ReactNode;
}) {
  const className =
    'flex items-center gap-3 rounded-xl px-1.5 py-2 text-sm no-underline transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-white/5';

  return (
    <Link to={`/${game}/$slug`} params={{ slug }} className={className}>
      {children}
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`dash-stat-${index}`} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default DashboardPage;

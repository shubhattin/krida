'use client';

import { useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Image } from '@unpic/react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Play,
  Target,
  Trophy,
  User
} from 'lucide-react';
import pretty_ms from 'pretty-ms';
import { useTRPC } from '~/api/client';
import type { GameDashboardStats } from '~/api/routers/user/user_dashboard';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import { GoogleIcon } from '~/components/icons';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { HUB_GAME_ACCENT, HUB_GAMES } from '~/components/hub/hub_games';
import Icon from '~/tools/Icon';
import { signOut, useSession } from '~/lib/auth-client';
import { startGoogleSignIn } from '~/lib/google_sign_in';
import { resetPosthog } from '~/components/tags/PosthogInit';
import type { GuestAuthPromptTrigger } from '~/lib/guest_auth_prompt';
import { cn } from '~/lib/utils';
import {
  isPublicGameKind,
  isSimpleGameKind,
  SIMPLE_GAME_META,
  type PublicGameKind,
  type SimpleGameKind
} from '~/util/games/kinds';
import { GAME_KINDS, type GameKind } from '~/util/catalog/tags';
import {
  useGuestAuthPrompt,
  useGuestCompletedCount
} from '~/components/app-bar/useGuestAuthPrompt';
import chipStyles from '~/components/app-bar/user-profile-chip.module.css';

/** Where the chip is rendered — drives accent colours and the header label. */
export type ProfileContext = 'krida' | PublicGameKind | SimpleGameKind;

/** Resolve the profile context from the first path segment (`/padajala/...`, `/dvayi/...`). */
export function profileContextFromPath(pathname: string): ProfileContext {
  const segment = pathname.split('/')[1] ?? '';
  if (isPublicGameKind(segment) || isSimpleGameKind(segment)) return segment;
  return 'krida';
}

type ProfileAccent = {
  label: string;
  /** Gradient stops for avatar / guest icon. */
  gradient: string;
  /** Soft header wash behind the signed-in card. */
  wash: string;
  /** Box-shadow colour for the guest prompt pulse / glow. */
  pulse: string;
};

const SIMPLE_PULSE = {
  dvayi: 'rgb(244 63 94 / 0.45)',
  bhramita: 'rgb(16 185 129 / 0.45)',
  surupa: 'rgb(139 92 246 / 0.45)',
  anveshi: 'rgb(14 165 233 / 0.45)'
} satisfies Record<SimpleGameKind, string>;

function profileAccent(context: ProfileContext): ProfileAccent {
  if (context === 'padavali') {
    return {
      label: HUB_GAMES.padavali.name,
      gradient: 'from-blue-500 to-indigo-600',
      wash: 'from-blue-50 via-sky-50 to-indigo-100 dark:from-blue-950/70 dark:via-slate-900 dark:to-indigo-950/80',
      pulse: 'rgb(59 130 246 / 0.45)'
    };
  }
  if (context === 'padajala') {
    return {
      label: HUB_GAMES.padajala.name,
      gradient: 'from-amber-500 to-orange-600',
      wash: 'from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/70 dark:via-stone-900 dark:to-orange-950/80',
      pulse: 'rgb(245 158 11 / 0.5)'
    };
  }
  if (context === 'krida') {
    return {
      label: 'Krida',
      gradient: 'from-violet-500 to-indigo-600',
      wash: 'from-violet-50 via-indigo-50 to-blue-100 dark:from-violet-950/60 dark:via-slate-900 dark:to-indigo-950/80',
      pulse: 'rgb(139 92 246 / 0.45)'
    };
  }
  const meta = SIMPLE_GAME_META[context];
  return {
    label: meta.name,
    gradient: `${meta.accent.from} ${meta.accent.to}`,
    wash: meta.accent.wash,
    pulse: SIMPLE_PULSE[context]
  };
}

const chipButtonClass =
  'relative size-8 shrink-0 overflow-hidden rounded-full border-slate-300/60 bg-white/80 p-0 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-slate-100/80 aria-expanded:bg-slate-100/80 active:scale-95 dark:border-slate-600/60 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:aria-expanded:bg-slate-700/80';

const popoverClass =
  'w-84 max-w-[calc(100vw-1rem)] overflow-hidden border-slate-200/80 bg-white/95 p-0 shadow-xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/95';

const emptySubscribe = () => () => {};

/** false during SSR + hydration; true after client commit — avoids session pending mismatch. */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function formatSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  return pretty_ms(Math.round(seconds) * 1000, { secondsDecimalDigits: 0 });
}

function formatAccuracy(accuracy: number | null | undefined): string {
  if (accuracy == null || !Number.isFinite(accuracy)) return '—';
  return `${Math.round(accuracy)}%`;
}

function initialsFromName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
}

function ProfileChipSkeleton() {
  return (
    <div className="size-8 shrink-0">
      <Skeleton className="size-8 rounded-full" />
    </div>
  );
}

export function UserProfileChip({ context }: { context: ProfileContext }) {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const [logoutOpen, setLogoutOpen] = useState(false);
  const isClient = useIsClient();
  const trpc = useTRPC();
  const prompt = useGuestAuthPrompt(!!user, isClient && !isPending);
  const guestCompleted = useGuestCompletedCount();
  const statsQuery = useQuery({
    ...trpc.user.get_dashboard.queryOptions({ game: 'all' }),
    // Fetch only when the popover opens. Gameplay mutations mark this stale.
    enabled: prompt.open && !!user
  });

  if (!isClient || isPending) {
    return <ProfileChipSkeleton />;
  }

  const accent = profileAccent(context);
  // SAFETY: CSSProperties has no index signature for custom properties; the key is a valid CSS var.
  const pulseStyle = { '--guest-auth-pulse': accent.pulse } as CSSProperties;

  return (
    <>
      <div
        className={cn('relative size-8 shrink-0', prompt.pulsing && chipStyles.pulse)}
        style={pulseStyle}
      >
        <Popover open={prompt.open} onOpenChange={prompt.onOpenChange}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className={chipButtonClass}
                aria-label={
                  user
                    ? 'Your profile'
                    : guestCompleted > 0
                      ? 'Sign in to save your progress'
                      : 'Sign in'
                }
              />
            }
          >
            {user ? (
              <Avatar>
                {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                <AvatarFallback
                  className={cn(
                    'bg-linear-to-br text-xs font-semibold text-white',
                    accent.gradient
                  )}
                >
                  {initialsFromName(user.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="text-slate-600 dark:text-slate-300" />
            )}
          </PopoverTrigger>
          {!user && guestCompleted > 0 && !prompt.open ? (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-linear-to-br ring-2 ring-white dark:ring-slate-900',
                accent.gradient
              )}
            />
          ) : null}
          <PopoverContent
            align="end"
            className={cn(popoverClass, prompt.autoOpen && chipStyles.glow)}
            style={pulseStyle}
          >
            {user ? (
              <SignedInCard
                context={context}
                accent={accent}
                name={user.name}
                image={user.image}
                data={statsQuery.data}
                loading={statsQuery.isLoading}
                error={statsQuery.isError}
                onNavigate={() => prompt.onOpenChange(false)}
                onLogout={() => {
                  prompt.onOpenChange(false);
                  setLogoutOpen(true);
                }}
              />
            ) : (
              <GuestCard
                accent={accent}
                trigger={prompt.trigger}
                autoOpen={prompt.autoOpen}
                canSnooze={prompt.canSnooze}
                completedCount={guestCompleted}
                onSignedIn={prompt.onSignIn}
                onNotNow={() => prompt.onOpenChange(false)}
                onSnooze={prompt.onSnooze}
              />
            )}
          </PopoverContent>
        </Popover>
      </div>
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You can sign back in anytime to keep your scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                void resetPosthog().then(() => signOut());
              }}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function guestCopy(trigger: GuestAuthPromptTrigger | null, completedCount: number) {
  if (trigger === 'personal_best') {
    return {
      title: 'New personal best!',
      description: 'Sign in with Google so your best times are tracked on your profile.'
    };
  }
  if (trigger === 'milestone') {
    return {
      title: `${completedCount} puzzles solved!`,
      description: 'Sign in with Google to keep track of your progress from here on.'
    };
  }
  if (trigger === 'complete') {
    return {
      title: 'Nicely solved',
      description: 'Sign in with Google so every puzzle you finish is saved to your profile.'
    };
  }
  if (trigger === 'return_visit') {
    return {
      title: 'Welcome back',
      description: 'Sign in with Google to track your scores and see your progress over time.'
    };
  }
  return {
    title: 'Save your progress',
    description: 'Continue with Google to keep scores across every game.'
  };
}

const GUEST_PERKS = [
  { label: 'Stats dashboard', icon: LayoutDashboard },
  { label: 'Best times', icon: Clock3 },
  { label: 'Any device', icon: MonitorSmartphone }
] as const;

function GuestCard({
  accent,
  trigger,
  autoOpen,
  canSnooze,
  completedCount,
  onSignedIn,
  onNotNow,
  onSnooze
}: {
  accent: ProfileAccent;
  trigger: GuestAuthPromptTrigger | null;
  autoOpen: boolean;
  canSnooze: boolean;
  completedCount: number;
  onSignedIn: () => void;
  onNotNow: () => void;
  onSnooze: () => void;
}) {
  // Manual opens get the neutral pitch; the trigger only shapes auto-opens.
  const copy = guestCopy(autoOpen ? trigger : null, completedCount);
  return (
    <div className="flex flex-col items-center gap-4 p-5 text-center">
      <div
        className={cn(
          'flex size-11 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg',
          accent.gradient
        )}
      >
        {autoOpen && (trigger === 'personal_best' || trigger === 'milestone') ? (
          <Trophy className="size-5" />
        ) : (
          <User className="size-5" />
        )}
      </div>
      <PopoverHeader className="items-center gap-1">
        <PopoverTitle className="text-base">{copy.title}</PopoverTitle>
        <PopoverDescription>{copy.description}</PopoverDescription>
      </PopoverHeader>
      {completedCount > 0 ? (
        <p className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-muted-foreground tabular-nums dark:bg-slate-700/60">
          {completedCount === 1
            ? '1 puzzle solved as a guest'
            : `${completedCount} puzzles solved as a guest`}
        </p>
      ) : null}
      <ul className="grid w-full grid-cols-3 gap-1.5">
        {GUEST_PERKS.map(({ label, icon: PerkIcon }) => (
          <li
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/80 px-1.5 py-2 text-[11px] text-muted-foreground dark:border-slate-700/80 dark:bg-slate-900/40"
          >
            <PerkIcon className="size-3.5 text-slate-500 dark:text-slate-400" />
            {label}
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={async () => {
          onSignedIn();
          await startGoogleSignIn('popover', autoOpen ? trigger : null);
        }}
      >
        <span data-icon="inline-start">
          <Icon src={GoogleIcon} />
        </span>
        Continue with Google
      </Button>
      {autoOpen ? (
        <div className="-mt-1 flex w-full items-center justify-center gap-1">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onNotNow}>
            Not now
          </Button>
          {canSnooze ? (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onSnooze}>
              Don&apos;t remind me
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type DashboardData = {
  totals: {
    started: number;
    completed: number;
    completion_rate: number;
    best_time_seconds: number | null;
    best_accuracy: number | null;
  };
} & Record<GameKind, GameDashboardStats>;

function SignedInCard({
  context,
  accent,
  name,
  image,
  data,
  loading,
  error,
  onNavigate,
  onLogout
}: {
  context: ProfileContext;
  accent: ProfileAccent;
  name: string | null | undefined;
  image: string | null | undefined;
  data: DashboardData | undefined;
  loading: boolean;
  error: boolean;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  // Current game first so its row sits right under the overview.
  const gameOrder: GameKind[] =
    context === 'krida' ? [...GAME_KINDS] : [context, ...GAME_KINDS.filter((g) => g !== context)];

  return (
    <div>
      <div
        className={cn(
          'relative flex items-center gap-3 bg-linear-to-br px-4 py-3.5 pr-11',
          accent.wash
        )}
      >
        <Avatar>
          {image ? <AvatarImage src={image} alt="" /> : null}
          <AvatarFallback
            className={cn('bg-linear-to-br font-semibold text-white', accent.gradient)}
          >
            {initialsFromName(name)}
          </AvatarFallback>
        </Avatar>
        <PopoverHeader className="min-w-0 flex-1 gap-0.5">
          <PopoverTitle className="truncate text-base">{name || 'Player'}</PopoverTitle>
          <PopoverDescription className="truncate">
            {context === 'krida' ? 'All your Krida games' : `Playing ${accent.label}`}
          </PopoverDescription>
        </PopoverHeader>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Log out"
          className="absolute top-1.5 right-1.5 text-muted-foreground"
          onClick={onLogout}
        >
          <LogOut />
        </Button>
      </div>

      <div className="flex flex-col gap-3 p-3.5">
        {loading ? <StatsSkeleton /> : null}
        {error ? <p className="text-sm text-destructive">Could not load your stats</p> : null}
        {data ? (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-0.5">
                <p className="text-[11px] font-semibold text-muted-foreground">All games</p>
                {data.totals.started > 0 ? (
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {data.totals.completion_rate}% completed
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatTile
                  label="Played"
                  value={String(data.totals.started)}
                  icon={<Play className="size-3.5" />}
                  iconClass="from-sky-500 to-blue-600 shadow-sky-500/25"
                />
                <StatTile
                  label="Completed"
                  value={String(data.totals.completed)}
                  icon={<CheckCircle2 className="size-3.5" />}
                  iconClass="from-emerald-500 to-teal-600 shadow-emerald-500/25"
                />
                <StatTile
                  label="Best time"
                  value={formatSeconds(data.totals.best_time_seconds)}
                  icon={<Clock3 className="size-3.5" />}
                  iconClass="from-amber-500 to-orange-600 shadow-amber-500/25"
                />
                <StatTile
                  label="Best acc."
                  value={formatAccuracy(data.totals.best_accuracy)}
                  icon={<Target className="size-3.5" />}
                  iconClass="from-violet-500 to-indigo-600 shadow-violet-500/25"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="px-0.5 text-[11px] font-semibold text-muted-foreground">By game</p>
              {gameOrder.map((game) => (
                <GameStatsRow
                  key={game}
                  game={game}
                  stats={data[game]}
                  current={context === game}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </>
        ) : null}

        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 no-underline transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-violet-700 dark:hover:bg-violet-950/30"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/30">
            <LayoutDashboard className="size-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Dashboard</p>
            <p className="truncate text-xs text-muted-foreground">Recent plays and top puzzles</p>
          </div>
          <ArrowRight className="size-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-slate-500" />
        </Link>
      </div>
    </div>
  );
}

function GameStatsRow({
  game,
  stats,
  current,
  onNavigate
}: {
  game: GameKind;
  stats: GameDashboardStats;
  current: boolean;
  onNavigate: () => void;
}) {
  const meta = HUB_GAMES[game];
  const gameAccent = HUB_GAME_ACCENT[game];
  const played = stats.started > 0;
  const progress = played ? Math.round((stats.completed / stats.started) * 100) : 0;

  return (
    <Link
      to="/puzzles"
      search={{ game: meta.puzzlesGame }}
      onClick={onNavigate}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-2.5 rounded-xl border px-2.5 py-2 no-underline transition-colors duration-200',
        current
          ? cn(gameAccent.border, 'bg-white/80 dark:bg-slate-900/50')
          : 'border-slate-200/80 bg-white/50 hover:bg-white/90 dark:border-slate-700/80 dark:bg-slate-900/25 dark:hover:bg-slate-900/50'
      )}
    >
      <Image
        src={GAME_APP_ICON_SRC[meta.icon]}
        alt=""
        width={28}
        height={28}
        className="size-7 shrink-0 drop-shadow-sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {meta.name}
          </p>
          <p className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {played ? `${stats.completed}/${stats.started} done` : 'Not played yet'}
          </p>
        </div>
        {played ? (
          <>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={cn('h-full rounded-full bg-linear-to-r', gameAccent.gradient)}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 flex gap-2.5 text-[11px] text-muted-foreground tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" />
                {formatSeconds(stats.best_time_seconds)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Target className="size-3" />
                {formatAccuracy(stats.best_accuracy)}
              </span>
            </p>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">{meta.subtitle} · Start playing</p>
        )}
      </div>
      <ArrowRight className="size-3.5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-slate-500" />
    </Link>
  );
}

function StatTile({
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
    <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 dark:border-slate-700/80 dark:bg-slate-900/40">
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white shadow-sm',
          iconClass
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
    </div>
  );
}

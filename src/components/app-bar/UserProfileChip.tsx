'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  LogOut,
  Play,
  Target,
  User
} from 'lucide-react';
import pretty_ms from 'pretty-ms';
import { useTRPC } from '~/api/client';
import type { DashboardGameId, GameDashboardStats } from '~/api/user_dashboard';
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
import Icon from '~/tools/Icon';
import { signIn, signOut, useSession } from '~/lib/auth-client';
import { cn } from '~/lib/utils';

const chipButtonClass =
  'relative size-8 shrink-0 overflow-hidden rounded-full border-slate-300/60 bg-white/80 p-0 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-slate-100/80 aria-expanded:bg-slate-100/80 active:scale-95 dark:border-slate-600/60 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:aria-expanded:bg-slate-700/80';

const popoverClass =
  'w-80 overflow-hidden border-slate-200/80 bg-white/95 p-0 shadow-xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/95';

function dashboardGameId(game: 'padavali' | 'crossword'): DashboardGameId {
  return game === 'padavali' ? 'padavali' : 'padajala';
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

export function UserProfileChip({
  game,
  gameLabel
}: {
  game: 'padavali' | 'crossword';
  gameLabel: string;
}) {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const dashboardGame = dashboardGameId(game);
  const trpc = useTRPC();
  const statsQuery = useQuery({
    ...trpc.user.get_dashboard.queryOptions({ game: dashboardGame }),
    // Fetch only when the popover opens. Gameplay mutations mark this stale.
    enabled: open && !!user
  });

  if (isPending) {
    return (
      <div className="size-8 shrink-0">
        <Skeleton className="size-8 rounded-full" />
      </div>
    );
  }

  const stats =
    dashboardGame === 'padavali' ? statsQuery.data?.padavali : statsQuery.data?.padajala;

  return (
    <>
      <div className="size-8 shrink-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className={chipButtonClass}
                aria-label={user ? 'Your profile' : 'Sign in'}
              />
            }
          >
            {user ? (
              <Avatar>
                {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                <AvatarFallback
                  className={cn(
                    'text-xs font-semibold text-white',
                    game === 'padavali'
                      ? 'bg-linear-to-br from-blue-500 to-indigo-600'
                      : 'bg-linear-to-br from-amber-500 to-orange-600'
                  )}
                >
                  {initialsFromName(user.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="text-slate-600 dark:text-slate-300" />
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className={popoverClass}>
            {user ? (
              <SignedInCard
                game={game}
                gameLabel={gameLabel}
                name={user.name}
                image={user.image}
                stats={stats}
                loading={statsQuery.isLoading}
                error={statsQuery.isError}
                onNavigate={() => setOpen(false)}
                onLogout={() => {
                  setOpen(false);
                  setLogoutOpen(true);
                }}
              />
            ) : (
              <GuestCard game={game} onSignedIn={() => setOpen(false)} />
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
            <AlertDialogAction variant="destructive" onClick={() => void signOut()}>
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function GuestCard({
  game,
  onSignedIn
}: {
  game: 'padavali' | 'crossword';
  onSignedIn: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-5 text-center">
      <div
        className={cn(
          'flex size-11 items-center justify-center rounded-2xl text-white shadow-lg',
          game === 'padavali'
            ? 'bg-linear-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'
            : 'bg-linear-to-br from-amber-500 to-orange-600 shadow-amber-500/30'
        )}
      >
        <User className="size-5" />
      </div>
      <PopoverHeader className="items-center gap-1">
        <PopoverTitle className="text-base">Save your progress</PopoverTitle>
        <PopoverDescription>
          Continue with Google to keep scores and unlock more features.
        </PopoverDescription>
      </PopoverHeader>
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={async () => {
          onSignedIn();
          await signIn.social({
            provider: 'google',
            callbackURL: window.location.href
          });
        }}
      >
        <span data-icon="inline-start">
          <Icon src={GoogleIcon} />
        </span>
        Continue with Google
      </Button>
    </div>
  );
}

function SignedInCard({
  game,
  gameLabel,
  name,
  image,
  stats,
  loading,
  error,
  onNavigate,
  onLogout
}: {
  game: 'padavali' | 'crossword';
  gameLabel: string;
  name: string | null | undefined;
  image: string | null | undefined;
  stats: GameDashboardStats | undefined;
  loading: boolean;
  error: boolean;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <div>
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-3.5 pr-11',
          game === 'padavali'
            ? 'bg-linear-to-br from-blue-50 via-sky-50 to-indigo-100 dark:from-blue-950/70 dark:via-slate-900 dark:to-indigo-950/80'
            : 'bg-linear-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/70 dark:via-stone-900 dark:to-orange-950/80'
        )}
      >
        <Avatar>
          {image ? <AvatarImage src={image} alt="" /> : null}
          <AvatarFallback
            className={cn(
              'font-semibold text-white',
              game === 'padavali'
                ? 'bg-linear-to-br from-blue-500 to-indigo-600'
                : 'bg-linear-to-br from-amber-500 to-orange-600'
            )}
          >
            {initialsFromName(name)}
          </AvatarFallback>
        </Avatar>
        <PopoverHeader className="min-w-0 flex-1 gap-0.5">
          <PopoverTitle className="truncate text-base">{name || 'Player'}</PopoverTitle>
          <PopoverDescription className="truncate">{gameLabel}</PopoverDescription>
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
        {stats ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                label="Played"
                value={String(stats.started)}
                icon={<Play className="size-3.5" />}
                iconClass="from-sky-500 to-blue-600 shadow-sky-500/25"
              />
              <StatTile
                label="Finished"
                value={String(stats.completed)}
                icon={<CheckCircle2 className="size-3.5" />}
                iconClass="from-emerald-500 to-teal-600 shadow-emerald-500/25"
              />
              <StatTile
                label="Best time"
                value={formatSeconds(stats.best_time_seconds)}
                icon={<Clock3 className="size-3.5" />}
                iconClass="from-amber-500 to-orange-600 shadow-amber-500/25"
              />
              <StatTile
                label="Best acc."
                value={formatAccuracy(stats.best_accuracy)}
                icon={<Target className="size-3.5" />}
                iconClass="from-violet-500 to-indigo-600 shadow-violet-500/25"
              />
            </div>
            {stats.completed > 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                Avg {formatSeconds(stats.avg_time_seconds)} · {formatAccuracy(stats.avg_accuracy)}{' '}
                accuracy
              </p>
            ) : null}
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
            <p className="truncate text-xs text-muted-foreground">All games and scores</p>
          </div>
          <ArrowRight className="size-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-slate-500" />
        </Link>
      </div>
    </div>
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
    <div className="grid grid-cols-2 gap-2">
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
    </div>
  );
}

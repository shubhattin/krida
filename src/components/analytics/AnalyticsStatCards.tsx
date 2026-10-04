'use client';

import type { ComponentType } from 'react';
import { Card } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';

export type AnalyticsStatAccent = {
  /** Icon tile — `from-x to-y shadow-*`. */
  gradient: string;
  /** Card wash — `from-x to-y` with alpha stops. */
  wash: string;
  /** Left rail + hover ring colour. */
  rail: string;
  ring: string;
};

/** Gradient pairs shared by the game and central analytics cards. */
export const ANALYTICS_STAT_ACCENTS = {
  sky: {
    gradient: 'from-sky-500 to-blue-600 shadow-sky-500/30',
    wash: 'from-sky-50/90 to-blue-50/50 dark:from-sky-950/50 dark:to-blue-950/30',
    rail: 'bg-sky-500',
    ring: 'hover:ring-sky-400/60 dark:hover:ring-sky-500/45'
  },
  emerald: {
    gradient: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
    wash: 'from-emerald-50/90 to-teal-50/50 dark:from-emerald-950/50 dark:to-teal-950/30',
    rail: 'bg-emerald-500',
    ring: 'hover:ring-emerald-400/60 dark:hover:ring-emerald-500/45'
  },
  violet: {
    gradient: 'from-violet-500 to-indigo-600 shadow-violet-500/30',
    wash: 'from-violet-50/90 to-indigo-50/50 dark:from-violet-950/50 dark:to-indigo-950/30',
    rail: 'bg-violet-500',
    ring: 'hover:ring-violet-400/60 dark:hover:ring-violet-500/45'
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    wash: 'from-amber-50/90 to-orange-50/50 dark:from-amber-950/50 dark:to-orange-950/30',
    rail: 'bg-amber-500',
    ring: 'hover:ring-amber-400/60 dark:hover:ring-amber-500/45'
  },
  rose: {
    gradient: 'from-rose-500 to-pink-600 shadow-rose-500/30',
    wash: 'from-rose-50/90 to-pink-50/50 dark:from-rose-950/50 dark:to-pink-950/30',
    rail: 'bg-rose-500',
    ring: 'hover:ring-rose-400/60 dark:hover:ring-rose-500/45'
  },
  fuchsia: {
    gradient: 'from-fuchsia-500 to-purple-600 shadow-fuchsia-500/30',
    wash: 'from-fuchsia-50/90 to-purple-50/50 dark:from-fuchsia-950/50 dark:to-purple-950/30',
    rail: 'bg-fuchsia-500',
    ring: 'hover:ring-fuchsia-400/60 dark:hover:ring-fuchsia-500/45'
  },
  slate: {
    gradient: 'from-slate-500 to-slate-700 shadow-slate-500/30',
    wash: 'from-slate-50/90 to-slate-100/50 dark:from-slate-900/70 dark:to-slate-800/40',
    rail: 'bg-slate-500',
    ring: 'hover:ring-slate-400/60 dark:hover:ring-slate-500/45'
  }
} as const satisfies Record<string, AnalyticsStatAccent>;

export type AnalyticsStatAccentName = keyof typeof ANALYTICS_STAT_ACCENTS;

export type AnalyticsStat = {
  label: string;
  value: string;
  /** Small caption under the value — one short line. */
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  accent: AnalyticsStatAccentName;
};

export function AnalyticsStatCard({ label, value, hint, icon: Icon, accent }: AnalyticsStat) {
  const theme = ANALYTICS_STAT_ACCENTS[accent];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden bg-linear-to-br ring-1 ring-black/5 transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-lg dark:ring-white/10',
        theme.wash,
        theme.ring
      )}
    >
      <div className={cn('absolute inset-y-2 left-0 w-1 rounded-r-full', theme.rail)} />
      <div className="flex items-start justify-between gap-2 p-3 pl-3.5">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="text-xl leading-none font-bold tracking-tight tabular-nums sm:text-2xl">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white shadow-sm',
            'transition-transform duration-300 group-hover:scale-105',
            theme.gradient
          )}
        >
          <Icon className="size-3.5" />
        </div>
      </div>
      {hint ? (
        <p className="px-3 pb-3 pl-3.5 text-[0.7rem] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  );
}

/**
 * Two columns on phones, three from 380px, then four / five on wider screens —
 * so the cards never squeeze into unreadable slivers on mobile.
 */
export function AnalyticsStatGrid({
  stats,
  className
}: {
  stats: AnalyticsStat[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 min-[380px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-5',
        className
      )}
    >
      {stats.map((stat) => (
        <AnalyticsStatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}

export function AnalyticsStatCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={`analytics-stat-skeleton-${index}`} className="overflow-hidden">
          <div className="flex items-start justify-between gap-2 p-3">
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-6 w-14" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  );
}

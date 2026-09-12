'use client';

import { TrophyIcon, UsersIcon } from 'lucide-react';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';

export type TopPlayedRow = {
  id: string;
  title: string;
  started: number;
  completed: number;
};

const STARTED_BAR_COLOR = 'hsl(210, 100%, 45%)';
const COMPLETED_BAR_COLOR = 'hsl(140, 70%, 40%)';

export function TopPlayedLeader({
  items,
  isLoading,
  title,
  subtitle,
  emptyMessage,
  accordionValue,
  variant
}: {
  items: TopPlayedRow[];
  isLoading: boolean;
  title: string;
  subtitle: string;
  emptyMessage: string;
  accordionValue: string;
  variant: 'puzzles' | 'users';
}) {
  const maxStarted = items.reduce((max, item) => Math.max(max, item.started), 0);
  const Icon = variant === 'users' ? UsersIcon : TrophyIcon;
  const iconClass =
    variant === 'users'
      ? 'text-sky-600 dark:text-sky-400'
      : 'text-amber-600 dark:text-amber-400';
  const iconWrapClass =
    variant === 'users' ? 'bg-sky-500/10' : 'bg-amber-500/10';

  return (
    <Accordion defaultValue={[]} className="w-full">
      <AccordionItem
        value={accordionValue}
        className="overflow-hidden rounded-xl border border-slate-200/50 bg-linear-to-br from-white/80 to-slate-50/40 dark:border-slate-700/50 dark:from-slate-900/80 dark:to-slate-800/40"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/5 ring-inset dark:ring-white/10 ${iconWrapClass}`}
            >
              <Icon className={`size-3.5 ${iconClass}`} />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold tracking-tight">{title}</p>
              <p className="text-xs font-normal text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: STARTED_BAR_COLOR }}
                  />
                  Started
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: COMPLETED_BAR_COLOR }}
                  />
                  Completed
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((item, index) => {
                  const barWidthPct = maxStarted > 0 ? (item.started / maxStarted) * 100 : 0;
                  const completedPct =
                    item.started > 0 ? Math.min(100, (item.completed / item.started) * 100) : 0;

                  return (
                    <div
                      key={item.id}
                      className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-slate-200/40 bg-white/50 px-3 py-2.5 dark:border-slate-700/40 dark:bg-slate-950/30"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium">
                          <span className="mr-1.5 text-muted-foreground tabular-nums">
                            #{index + 1}
                          </span>
                          {item.title}
                        </p>
                        <p className="shrink-0 text-[0.7rem] text-muted-foreground tabular-nums">
                          {item.completed}/{item.started}
                        </p>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="relative h-full overflow-hidden rounded-full transition-[width] duration-300"
                          style={{
                            width: `${barWidthPct}%`,
                            backgroundColor: STARTED_BAR_COLOR
                          }}
                        >
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
                            style={{
                              width: `${completedPct}%`,
                              backgroundColor: COMPLETED_BAR_COLOR
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

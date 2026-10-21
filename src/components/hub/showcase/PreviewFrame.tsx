'use client';

import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

/** Resolves `true` after `ms`; never resolves once the loop is stopped. */
export type DemoWait = (ms: number) => Promise<boolean>;

/**
 * Runs `step` back-to-back until the returned stop function is called. Each step awaits
 * `wait` between frames; stopping clears the pending timer so no state updates leak past
 * unmount. Use as `useEffect(() => startDemoLoop(...), [])`.
 */
export function startDemoLoop(step: (wait: DemoWait) => Promise<void>) {
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wait: DemoWait = (ms) =>
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(alive), ms);
    });
  void (async () => {
    while (alive) await step(wait);
  })();
  return () => {
    alive = false;
    clearTimeout(timer);
  };
}

const DEMO_PILL = {
  idle: 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400',
  success: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
} as const;

/** Shared chrome for the hub's animated game demos: status row, square stage, hint. */
export function PreviewFrame({
  badge,
  hint,
  compact = false,
  children
}: {
  badge?: ReactNode;
  hint?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-slate-200/40 bg-slate-100/40 dark:border-slate-800/40 dark:bg-slate-950/20',
        compact ? 'p-3' : 'p-4.5'
      )}
    >
      <div className={cn('flex items-center justify-between gap-2', compact ? 'mb-2' : 'mb-3')}>
        <div className="flex items-center gap-1.5">
          <div className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Live Demo
          </span>
        </div>
        <div className="flex items-center gap-1.5">{badge}</div>
      </div>
      <div className={cn('mx-auto w-full', compact ? 'max-w-[16.5rem]' : 'max-w-[20.5rem]')}>
        {children}
      </div>
      {hint ? (
        <p
          className={cn(
            'text-center text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500',
            compact ? 'mt-1.5' : 'mt-2.5'
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function DemoPill({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums shadow-xs',
        done ? DEMO_PILL.success : DEMO_PILL.idle
      )}
    >
      {children}
    </span>
  );
}

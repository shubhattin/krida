'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '~/lib/utils';

/** Resolves `true` after `ms`; resolves `false` once the loop is stopped. */
export type DemoWait = (ms: number) => Promise<boolean>;

/** Whether a demo may advance right now, plus change notifications. */
export type DemoGate = {
  isActive: () => boolean;
  subscribe: (onChange: () => void) => () => void;
};

const ALWAYS_ACTIVE: DemoGate = { isActive: () => true, subscribe: () => () => {} };

/** Share of the demo that must be on screen before it plays. */
const DEMO_VISIBLE_RATIO = 0.4;

function createDemoGate() {
  // Paused until the first observation, so demos mounted off screen never start.
  let active = false;
  const listeners = new Set<() => void>();
  return {
    isActive: () => active,
    subscribe: (onChange: () => void) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    set: (next: boolean) => {
      if (next === active) return;
      active = next;
      for (const onChange of listeners) onChange();
    }
  };
}

const DemoGateContext = createContext<DemoGate>(ALWAYS_ACTIVE);

/** Gate from the nearest `DemoVisibilityGate`; always active outside one. */
export function useDemoGate(): DemoGate {
  return useContext(DemoGateContext);
}

/**
 * Lets the demos inside play only while this box is mostly on screen and the tab is visible.
 * Clipping by scroll rails counts, so a card scrolled out of a carousel (or the peek of the
 * next one on phones) holds still while the cards in view keep playing.
 */
export function DemoVisibilityGate({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [gate] = useState(createDemoGate);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let onScreen = false;
    const sync = () => gate.set(onScreen && document.visibilityState === 'visible');
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Small tolerance: the ratio reported at a threshold crossing can land just under it.
        onScreen = !!entry?.isIntersecting && entry.intersectionRatio >= DEMO_VISIBLE_RATIO - 0.01;
        sync();
      },
      { threshold: [0, 0.2, DEMO_VISIBLE_RATIO, 0.6, 0.8, 1] }
    );
    observer.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [gate]);

  return (
    <div ref={ref} className={className}>
      <DemoGateContext.Provider value={gate}>{children}</DemoGateContext.Provider>
    </div>
  );
}

/**
 * Runs `step` back-to-back until the returned stop function is called. Each step awaits
 * `wait` between frames; while `gate` is inactive the pending frame holds instead of
 * advancing. Stopping clears the timer and releases the hold, so no state updates leak
 * past unmount. Use as `useEffect(() => startDemoLoop(gate, ...), [gate])`.
 */
export function startDemoLoop(gate: DemoGate, step: (wait: DemoWait) => Promise<void>) {
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let release: (() => void) | undefined;
  let settle: ((value: boolean) => void) | undefined;
  const wait: DemoWait = (ms) =>
    new Promise((resolve) => {
      settle = resolve;
      timer = setTimeout(() => {
        if (gate.isActive()) {
          resolve(alive);
          return;
        }
        // Off screen: hold this frame until the demo is back in view.
        release = gate.subscribe(() => {
          if (!gate.isActive()) return;
          release?.();
          release = undefined;
          resolve(alive);
        });
      }, ms);
    });
  void (async () => {
    while (alive) await step(wait);
  })();
  return () => {
    alive = false;
    clearTimeout(timer);
    release?.();
    settle?.(false);
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

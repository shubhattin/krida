'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Timer, XCircle } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { SimpleGameKind } from '~/util/games/kinds';
import { formatClock, playGradient } from './theme';

/** Progress, clock and mistake counter shown above every simple-game board. */
export function GameHud({
  kind,
  label,
  done,
  total,
  seconds,
  mistakes,
  children
}: {
  kind: SimpleGameKind;
  label: string;
  done: number;
  total: number;
  seconds: number;
  /** Omit for games without a mistake count (Surūpa). */
  mistakes?: number;
  children?: ReactNode;
}) {
  const ratio = total === 0 ? 0 : Math.min(1, done / total);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="min-w-40 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold text-foreground/90">{label}</span>
          <span className="font-semibold text-muted-foreground tabular-nums">
            {done}
            <span className="opacity-60"> / {total}</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundImage: playGradient(kind) }}
            initial={false}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ type: 'spring', stiffness: 140, damping: 22 }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {children}
        <HudPill>
          <Timer className="size-3.5" />
          {formatClock(seconds)}
        </HudPill>
        {mistakes === undefined ? null : (
          <motion.span
            key={mistakes}
            initial={mistakes > 0 ? { scale: 1.25 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <HudPill className={cn(mistakes > 0 && 'text-red-600 dark:text-red-400')}>
              <XCircle className="size-3.5" />
              {mistakes}
            </HudPill>
          </motion.span>
        )}
      </div>
    </div>
  );
}

export function HudPill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground tabular-nums',
        className
      )}
    >
      {children}
    </span>
  );
}

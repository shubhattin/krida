'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import { Timer, Trophy } from 'lucide-react';
import { formatElapsed } from '~/util/cross_word/game_model';
import { completed_atom, progress_atom, seconds_atom, started_atom } from './game_state';
import styles from './crossword-game.module.css';

export function GameProgress() {
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);
  const seconds = useAtomValue(seconds_atom);
  const progress = useAtomValue(progress_atom);

  if (!started) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center gap-4 text-sm text-muted-foreground"
    >
      <div className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-card/60 px-3 py-1 backdrop-blur-md">
        <Timer className="size-3.5 text-primary" />
        <span
          className="font-mono text-foreground tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {formatElapsed(seconds)}
        </span>
      </div>

      <div
        className="relative h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-muted/50"
        role="progressbar"
        aria-valuenow={progress.solvedCount}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-label="Words solved"
      >
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      <div className="rounded-lg border border-primary/30 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_15%,transparent),color-mix(in_oklch,hsl(262_83%_58%)_10%,transparent))] px-3 py-1 font-semibold">
        <span className="flex items-center gap-1.5 tabular-nums">
          {completed && <Trophy className="size-3.5 text-amber-500" />}
          {progress.solvedCount}/{progress.total}
        </span>
      </div>
    </motion.div>
  );
}

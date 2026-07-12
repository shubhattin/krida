'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import { Timer, Trophy } from 'lucide-react';
import { formatElapsed } from '~/util/cross_word/cross_word_schema';
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
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Timer badge */}
      <div className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-card/60 px-3 py-1 backdrop-blur-md">
        <Timer className="size-3.5 text-primary" />
        <span className="font-mono tabular-nums text-foreground">{formatElapsed(seconds)}</span>
      </div>

      {/* Progress bar — shimmer uses CSS module (animated background-position) */}
      <div className="relative h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-muted/50">
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {/* Score badge */}
      <div className="rounded-lg border border-primary/30 bg-[linear-gradient(135deg,hsl(var(--primary)/0.15),hsl(262_83%_58%/0.1))] px-3 py-1 font-semibold">
        <span className="flex items-center gap-1.5 tabular-nums">
          {completed && <Trophy className="size-3.5 text-amber-500" />}
          {progress.solvedCount}/{progress.total}
        </span>
      </div>
    </motion.div>
  );
}

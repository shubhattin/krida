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
      <div className={styles.timerBadge}>
        <Timer className="size-3.5 text-primary" />
        <span className="font-mono tabular-nums text-foreground">{formatElapsed(seconds)}</span>
      </div>
      <div className={`h-2 min-w-24 flex-1 overflow-hidden ${styles.progressBar} bg-muted/50`}>
        <motion.div
          className={`h-full ${styles.progressFill}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
      <div className={styles.scoreBadge}>
        <span className="flex items-center gap-1.5 tabular-nums">
          {completed && <Trophy className="size-3.5 text-amber-500" />}
          {progress.solvedCount}/{progress.total}
        </span>
      </div>
    </motion.div>
  );
}

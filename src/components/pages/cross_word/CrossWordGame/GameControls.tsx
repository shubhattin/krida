'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import { Play, PartyPopper } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { completed_atom, started_atom } from './game_state';
import type { useCrossWordGame } from './useCrossWordGame';
import styles from './crossword-game.module.css';

type GameControlsProps = {
  game: ReturnType<typeof useCrossWordGame>;
  onAfterStart?: () => void;
};

export function GameControls({ game, onAfterStart }: GameControlsProps) {
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);

  const handleStart = () => {
    game.startGame();
    // After Start paints: either auto-open the in-app keyboard (touch devices)
    // or focus the native hidden-input bridge — depending on the experiment flag.
    requestAnimationFrame(() => onAfterStart?.());
  };

  if (!started) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <Button
          size="sm"
          onClick={handleStart}
          className={cn(
            'group relative h-9 gap-1.5 overflow-hidden rounded-lg border-none px-3.5',
            'bg-linear-to-r from-blue-500 to-indigo-500 text-sm font-bold text-white',
            'shadow-md shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg hover:shadow-blue-500/35',
            'dark:from-blue-600 dark:to-indigo-600 dark:shadow-blue-900/40 dark:hover:from-blue-700 dark:hover:to-indigo-700',
            'transition-all duration-200 hover:scale-105 active:scale-95',
            styles.startButton
          )}
        >
          <span className={styles.startButtonShine} aria-hidden />
          <Play className="relative size-3.5 fill-current" />
          <span className="relative">Start</span>
        </Button>
      </motion.div>
    );
  }

  if (completed) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <Button
          size="sm"
          variant="outline"
          onClick={handleStart}
          className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-400"
        >
          <PartyPopper className="size-4" />
          Play again
        </Button>
      </motion.div>
    );
  }

  // Mid-game reset lives in GameProgress (top bar).
  return null;
}

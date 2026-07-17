'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import { Play, RotateCcw, PartyPopper } from 'lucide-react';
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
        {/* startButton keeps in module: hover pseudo-class with box-shadow+translateY */}
        <Button
          size="lg"
          onClick={handleStart}
          className={cn(
            'gap-2 border-none bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(262_83%_58%))] text-primary-foreground',
            'shadow-[0_4px_15px_hsl(var(--primary)/0.4),0_0_20px_hsl(var(--primary)/0.15)]',
            styles.startButton
          )}
        >
          <Play className="size-5" />
          Start
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* resetButton keeps in module: ::before pseudo-element ripple */}
      <Button
        size="sm"
        variant="ghost"
        onClick={game.resetGame}
        className={cn('gap-1.5', styles.resetButton)}
      >
        <RotateCcw className="size-3.5" />
        Reset
      </Button>
    </motion.div>
  );
}

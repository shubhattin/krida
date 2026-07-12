'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import { Play, RotateCcw, PartyPopper } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { completed_atom, started_atom } from './game_state';
import type { useCrossWordGame } from './useCrossWordGame';
import styles from './crossword-game.module.css';

type GameControlsProps = {
  game: ReturnType<typeof useCrossWordGame>;
};

export function GameControls({ game }: GameControlsProps) {
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);

  if (!started) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <Button
          size="lg"
          onClick={game.startGame}
          className={`gap-2 ${styles.startButton}`}
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
        <Button size="sm" variant="outline" onClick={game.startGame} className="gap-1.5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400">
          <PartyPopper className="size-4" />
          Play again
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={game.resetGame}
        className={`gap-1.5 ${styles.resetButton}`}
      >
        <RotateCcw className="size-3.5" />
        Reset
      </Button>
    </motion.div>
  );
}

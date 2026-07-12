'use client';

import { cn } from '~/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './crossword-game.module.css';

type CrossWordCellProps = {
  row: number;
  col: number;
  letter: string;
  clueNumber?: number;
  blocked: boolean;
  fixed: boolean;
  selected: boolean;
  inActiveWord: boolean;
  solved: boolean;
  justSolved: boolean;
  incorrect: boolean;
  disabled: boolean;
  onSelect: () => void;
};

export function CrossWordCell({
  row,
  col,
  letter,
  clueNumber,
  blocked,
  fixed,
  selected,
  inActiveWord,
  solved,
  justSolved,
  incorrect,
  disabled,
  onSelect
}: CrossWordCellProps) {
  if (blocked) {
    return (
      <div
        aria-hidden
        className={cn(styles.blocked, 'size-full')}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={`Row ${row + 1}, column ${col + 1}${clueNumber ? `, clue ${clueNumber}` : ''}${letter ? `, letter ${letter}` : ', empty'}`}
      className={cn(
        styles.playable,
        'relative size-full outline-none',
        'flex items-center justify-center font-bold uppercase',
        'text-[clamp(1rem,4.5vw,1.5rem)] leading-none',
        'transition-all duration-150',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        fixed && 'bg-muted/80 text-muted-foreground',
        // Priority order matters: selected > inWord > solved
        // solved bg is always shown if solved
        solved && styles.cellSolved,
        solved && 'text-emerald-700 dark:text-emerald-400',
        // Pulse fires once on first solve
        justSolved && styles.cellJustSolved,
        // Active word — warm amber tint (clearly different from cursor highlight)
        inActiveWord && !selected && !solved && styles.cellInWord,
        // Selected cursor — strongest signal, overrides everything visually
        selected && styles.cellSelected,
        incorrect && !solved && 'bg-destructive/10 text-destructive',
        incorrect && !solved && styles.cellIncorrect,
        disabled && 'cursor-default'
      )}
    >
      {clueNumber ? (
        <span className="pointer-events-none absolute top-px left-0.5 text-[0.5rem] leading-none font-semibold text-muted-foreground/70 sm:text-[0.6rem]">
          {clueNumber}
        </span>
      ) : null}
      <AnimatePresence mode="wait">
        {letter ? (
          <motion.span
            key={letter}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
            className="select-none"
          >
            {letter}
          </motion.span>
        ) : (
          <span key="empty" className="select-none" />
        )}
      </AnimatePresence>
    </button>
  );
}

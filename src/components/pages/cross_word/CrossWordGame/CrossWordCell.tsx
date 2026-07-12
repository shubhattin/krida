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
    return <div aria-hidden className={cn(styles.blocked, 'size-full')} />;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={`Row ${row + 1}, column ${col + 1}${clueNumber ? `, clue ${clueNumber}` : ''}${letter ? `, letter ${letter}` : ', empty'}`}
      className={cn(
        // Base
        'relative size-full bg-card text-card-foreground outline-none',
        'flex items-center justify-center font-bold uppercase',
        'text-[clamp(1rem,4.5vw,1.5rem)] leading-none',
        'transition-all duration-150',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        // Fixed (pre-filled) cell
        fixed && 'bg-muted/80 text-muted-foreground',
        // Solved — light warm green gradient + readable text
        solved &&
          'bg-[linear-gradient(135deg,hsl(138_65%_52%/0.22),hsl(152_60%_48%/0.28))] text-emerald-700 dark:text-emerald-400',
        // Pulse fires once on word acceptance (CSS keyframe — must stay in module)
        justSolved && styles.cellJustSolved,
        // Active word path — warm amber, clearly distinct from cursor
        inActiveWord && !selected && !solved && 'bg-[hsl(38_95%_55%/0.15)]',
        // Selected cursor — strongest signal, primary ring + background tint
        selected &&
          'z-10 bg-primary/20 shadow-[inset_0_0_0_2.5px_hsl(var(--primary)),0_0_16px_hsl(var(--primary)/0.45)]',
        // Incorrect
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

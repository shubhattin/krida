'use client';

import { cn } from '~/lib/utils';

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
  incorrect,
  disabled,
  onSelect
}: CrossWordCellProps) {
  if (blocked) {
    return (
      <div
        aria-hidden
        className="cw-cell-blocked size-full"
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
        'cw-cell-playable relative size-full outline-none',
        'flex items-center justify-center font-bold uppercase',
        'text-[clamp(1rem,4.5vw,1.5rem)] leading-none',
        'transition-colors duration-100',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        fixed && 'bg-muted text-muted-foreground',
        inActiveWord && !selected && 'bg-accent/60',
        selected && 'z-10 bg-primary/25 ring-2 ring-primary ring-inset',
        solved && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        incorrect && !solved && 'bg-destructive/10 text-destructive',
        disabled && 'cursor-default'
      )}
    >
      {clueNumber ? (
        <span className="pointer-events-none absolute top-px left-0.5 text-[0.5rem] leading-none font-semibold text-muted-foreground sm:text-[0.6rem]">
          {clueNumber}
        </span>
      ) : null}
      <span className="select-none">{letter}</span>
    </button>
  );
}

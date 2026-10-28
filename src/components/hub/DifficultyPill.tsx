import { cn } from '~/lib/utils';
import type { DifficultyLevel } from '~/util/catalog/difficulty';

export const DIFFICULTY_TONE = {
  easy: {
    dot: 'bg-emerald-500',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/70 dark:text-emerald-200'
  },
  medium: {
    dot: 'bg-amber-500',
    pill: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/70 dark:text-amber-200'
  },
  hard: {
    dot: 'bg-rose-500',
    pill: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/70 dark:text-rose-200'
  },
  elite: {
    dot: 'bg-violet-500',
    pill: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-950/70 dark:text-violet-200'
  }
} satisfies Record<DifficultyLevel['key'], { dot: string; pill: string }>;

/** Small "● Easy" label for a puzzle's difficulty. */
export function DifficultyPill({
  level,
  className
}: {
  level: DifficultyLevel;
  className?: string;
}) {
  return (
    <span
      title={`Difficulty: ${level.label}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-sm',
        DIFFICULTY_TONE[level.key].pill,
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', DIFFICULTY_TONE[level.key].dot)} aria-hidden />
      {level.label}
    </span>
  );
}

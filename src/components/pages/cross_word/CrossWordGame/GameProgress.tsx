'use client';

import { useAtomValue } from 'jotai';
import { formatElapsed } from '~/util/cross_word/cross_word_schema';
import { completed_atom, progress_atom, seconds_atom, started_atom } from './game_state';

export function GameProgress() {
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);
  const seconds = useAtomValue(seconds_atom);
  const progress = useAtomValue(progress_atom);

  if (!started) return null;

  return (
    <div
      className="flex items-center gap-4 text-sm text-muted-foreground"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="font-mono tabular-nums text-foreground">{formatElapsed(seconds)}</span>
      <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <span className="shrink-0 tabular-nums">
        {progress.solvedCount}/{progress.total}
        {completed ? ' ✓' : ''}
      </span>
    </div>
  );
}

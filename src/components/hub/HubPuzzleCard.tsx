'use client';

import { CrosswordPreviewCard } from '~/components/pages/cross_word/CrosswordPreviewCard';
import { PuzzlePreviewCard } from '~/components/pages/padavali/PuzzlePreviewCard';
import type { HubPuzzle } from './hub_puzzles';
import { HubGameBadge } from './HubGameBadge';
import { cn } from '~/lib/utils';

/** Renders a puzzle from any game with that game's own preview card. */
export function HubPuzzleCard({
  puzzle,
  compact,
  showGameBadge = true,
  step
}: {
  puzzle: HubPuzzle;
  compact?: boolean;
  showGameBadge?: boolean;
  step?: number;
}) {
  return (
    <div className="relative h-full">
      {showGameBadge ? (
        <HubGameBadge game={puzzle.game} className="absolute top-2 left-2 z-10 shadow-md" />
      ) : null}
      {step != null ? (
        <span
          className={cn(
            'absolute top-2 z-10 flex size-7 items-center justify-center rounded-full bg-slate-950/80 text-xs font-bold text-white shadow-md',
            showGameBadge ? 'right-2' : 'left-2'
          )}
        >
          {step}
        </span>
      ) : null}
      {puzzle.game === 'padavali' ? (
        <PuzzlePreviewCard puzzle={puzzle.source} compact={compact} />
      ) : (
        <CrosswordPreviewCard puzzle={puzzle.source} compact={compact} />
      )}
    </div>
  );
}

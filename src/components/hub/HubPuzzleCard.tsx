'use client';

import { CrosswordPreviewCard } from '~/components/pages/cross_word/CrosswordPreviewCard';
import { PuzzlePreviewCard } from '~/components/pages/padavali/PuzzlePreviewCard';
import type { HubPuzzle } from './hub_puzzles';
import { HubGameBadge } from './HubGameBadge';

/** Renders a puzzle from any game with that game's own preview card and a game badge. */
export function HubPuzzleCard({ puzzle, compact }: { puzzle: HubPuzzle; compact?: boolean }) {
  return (
    <div className="relative h-full">
      <div className="pointer-events-none absolute top-2 left-2 z-10">
        <HubGameBadge game={puzzle.game} />
      </div>
      {puzzle.game === 'padavali' ? (
        <PuzzlePreviewCard puzzle={puzzle.source} compact={compact} />
      ) : (
        <CrosswordPreviewCard puzzle={puzzle.source} compact={compact} />
      )}
    </div>
  );
}

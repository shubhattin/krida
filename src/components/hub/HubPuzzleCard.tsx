'use client';

import { CrosswordPreviewCard } from '~/components/pages/cross_word/CrosswordPreviewCard';
import { PuzzlePreviewCard } from '~/components/pages/padavali/PuzzlePreviewCard';
import type { HubPuzzle } from './hub_puzzles';

/** Renders a puzzle from any game with that game's own preview card. */
export function HubPuzzleCard({ puzzle, compact }: { puzzle: HubPuzzle; compact?: boolean }) {
  return puzzle.game === 'padavali' ? (
    <PuzzlePreviewCard puzzle={puzzle.source} compact={compact} />
  ) : (
    <CrosswordPreviewCard puzzle={puzzle.source} compact={compact} />
  );
}

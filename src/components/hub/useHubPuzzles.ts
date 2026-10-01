'use client';

import { useMemo } from 'react';
import { useListedPuzzlesDisplay } from '~/components/pages/padavali/useListedPuzzlesDisplay';
import { useCrosswordListedPuzzles } from '~/components/pages/cross_word/useCrosswordListedPuzzles';
import type { HubData } from './hub_data';
import { toHubPuzzles, type HubPuzzle } from './hub_puzzles';

/** Live, script-aware list of every listed puzzle across games (Padavali first, then Padajala). */
export function useHubPuzzles(data: HubData) {
  const padavali = useListedPuzzlesDisplay(
    data.padavali.listed,
    data.padavali.listed_init_transliterated
  );
  const crossword = useCrosswordListedPuzzles(data.crossword.listed);

  const puzzles = useMemo(() => toHubPuzzles(padavali, crossword), [padavali, crossword]);
  const byKey = useMemo(
    () => new Map<string, HubPuzzle>(puzzles.map((puzzle) => [puzzle.key, puzzle])),
    [puzzles]
  );

  return { puzzles, byKey, padavali, crossword };
}

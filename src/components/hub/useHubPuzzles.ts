'use client';

import { useMemo } from 'react';
import { useListedPuzzlesDisplay } from '~/components/pages/padavali/useListedPuzzlesDisplay';
import { usePadajalaListedPuzzles } from '~/components/pages/padajala/usePadajalaListedPuzzles';
import type { HubData } from './hub_data';
import { toHubPuzzles, type HubPuzzle } from './hub_puzzles';

/** Live, script-aware list of every listed puzzle across games, sorted by recency. */
export function useHubPuzzles(data: HubData) {
  const padavali = useListedPuzzlesDisplay(
    data.padavali.listed,
    data.padavali.listed_init_transliterated
  );
  const padajala = usePadajalaListedPuzzles(data.padajala.listed);

  const puzzles = useMemo(
    () =>
      toHubPuzzles(padavali, padajala, {
        dvayi: data.dvayi.listed,
        bhramita: data.bhramita.listed,
        surupa: data.surupa.listed,
        anveshi: data.anveshi.listed
      }),
    [padavali, padajala, data]
  );
  const byKey = useMemo(
    () => new Map<string, HubPuzzle>(puzzles.map((puzzle) => [puzzle.key, puzzle])),
    [puzzles]
  );

  return { puzzles, byKey, padavali, padajala };
}

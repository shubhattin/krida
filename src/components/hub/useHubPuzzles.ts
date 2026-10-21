'use client';

import { useMemo } from 'react';
import { useListedPuzzlesDisplay } from '~/components/pages/padavali/useListedPuzzlesDisplay';
import { usePadajalaListedPuzzles } from '~/components/pages/padajala/usePadajalaListedPuzzles';
import type { HubData } from './hub_data';
import { toHubPuzzles, type HubPuzzle } from './hub_puzzles';
import { useSimpleListedPuzzles } from './useSimpleListedPuzzles';

/** Live, script-aware list of every listed puzzle across games, sorted by recency. */
export function useHubPuzzles(data: HubData) {
  const padavali = useListedPuzzlesDisplay(
    data.padavali.listed,
    data.padavali.listed_init_transliterated
  );
  const padajala = usePadajalaListedPuzzles(data.padajala.listed);
  const dvayi = useSimpleListedPuzzles(data.dvayi.listed, data.dvayi.listed_init_transliterated);
  const bhramita = useSimpleListedPuzzles(
    data.bhramita.listed,
    data.bhramita.listed_init_transliterated
  );
  const surupa = useSimpleListedPuzzles(data.surupa.listed, data.surupa.listed_init_transliterated);
  const anveshi = useSimpleListedPuzzles(
    data.anveshi.listed,
    data.anveshi.listed_init_transliterated
  );

  const puzzles = useMemo(
    () => toHubPuzzles(padavali, padajala, { dvayi, bhramita, surupa, anveshi }),
    [padavali, padajala, dvayi, bhramita, surupa, anveshi]
  );
  const byKey = useMemo(
    () => new Map<string, HubPuzzle>(puzzles.map((puzzle) => [puzzle.key, puzzle])),
    [puzzles]
  );

  return { puzzles, byKey, padavali, padajala };
}

'use client';

import { useMemo } from 'react';
import { useListedPuzzlesDisplay } from '~/components/pages/padavali/useListedPuzzlesDisplay';
import { usePadajalaListedPuzzles } from '~/components/pages/padajala/usePadajalaListedPuzzles';
import type { HubData } from './hub_data';
import { toHubPuzzles, type HubPuzzle } from './hub_puzzles';
import { useSimpleListedPuzzles } from './useSimpleListedPuzzles';
import type { GameKind } from '~/util/catalog/tags';

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

  const puzzles = useMemo(() => {
    // Defense-in-depth for the release gate: hidden games contribute zero rows
    // today, but never let one leak into public UI if a cache shape changes.
    const visible = new Set<GameKind>(data.visibleGames);
    return toHubPuzzles(padavali, padajala, { dvayi, bhramita, surupa, anveshi }).filter((puzzle) =>
      visible.has(puzzle.game)
    );
  }, [padavali, padajala, dvayi, bhramita, surupa, anveshi, data.visibleGames]);
  const byKey = useMemo(
    () => new Map<string, HubPuzzle>(puzzles.map((puzzle) => [puzzle.key, puzzle])),
    [puzzles]
  );

  return { puzzles, byKey, padavali, padajala };
}

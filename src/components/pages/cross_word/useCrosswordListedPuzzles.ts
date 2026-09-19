'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { client } from '~/api/client';
import type { CrosswordListedPuzzlesType } from '~/util/cache.server/crossword_cache';

/** Public browse list (home embed + /padajala/puzzles). */
export const padajalaListedPuzzleQueryKey = ['listed_puzzle', 'padajala'] as const;

const crosswordListedCarouselQueryKey = ['crossword_listed_puzzles_carousel'] as const;
/** Admin editor puzzle list pages. */
const crosswordAdminListQueryKey = ['crossword_list'] as const;

/** Call after `router.invalidate()` so browse queries refetch with fresh loader/API data. */
export function invalidatePadajalaListedPuzzleQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: padajalaListedPuzzleQueryKey });
  void queryClient.invalidateQueries({ queryKey: crosswordListedCarouselQueryKey });
  void queryClient.invalidateQueries({ queryKey: crosswordAdminListQueryKey });
}

/**
 * Padajala browse list: SSR loader seeds RQ; script switching is N/A (no transliteration).
 * Invalidate via `invalidatePadajalaListedPuzzleQueries` after edits.
 */
export function useCrosswordListedPuzzles(initial: CrosswordListedPuzzlesType) {
  const query = useQuery({
    queryKey: padajalaListedPuzzleQueryKey,
    queryFn: () => client.crossword.get_listed_puzzles.query(),
    initialData: initial,
    staleTime: Infinity
  });
  return query.data ?? initial;
}

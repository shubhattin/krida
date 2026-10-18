'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { client } from '~/api/client';
import type { PadajalaListedPuzzlesType } from '~/util/cache.server/padajala_cache';

/** Public browse list (home embed + /puzzles). */
export const padajalaListedPuzzleQueryKey = ['listed_puzzle', 'padajala'] as const;

const padajalaListedCarouselQueryKey = ['padajala_listed_puzzles_carousel'] as const;
/** Admin editor puzzle list pages. */
const padajalaAdminListQueryKey = ['padajala_list'] as const;

/** Call after `router.invalidate()` so browse queries refetch with fresh loader/API data. */
export function invalidatePadajalaListedPuzzleQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: padajalaListedPuzzleQueryKey });
  void queryClient.invalidateQueries({ queryKey: padajalaListedCarouselQueryKey });
  void queryClient.invalidateQueries({ queryKey: padajalaAdminListQueryKey });
}

/**
 * Padajala browse list: SSR loader seeds RQ; script switching is N/A (no transliteration).
 * Invalidate via `invalidatePadajalaListedPuzzleQueries` after edits.
 */
export function usePadajalaListedPuzzles(initial: PadajalaListedPuzzlesType) {
  const query = useQuery({
    queryKey: padajalaListedPuzzleQueryKey,
    queryFn: () => client.padajala.get_listed_puzzles.query(),
    initialData: initial,
    staleTime: Infinity
  });
  return query.data ?? initial;
}

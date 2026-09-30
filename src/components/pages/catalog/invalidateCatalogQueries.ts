import type { QueryClient } from '@tanstack/react-query';
import type { useTRPC } from '~/api/client';
import { invalidatePadajalaListedPuzzleQueries } from '~/components/pages/cross_word/useCrosswordListedPuzzles';
import { invalidatePadavaliListedPuzzleQueries } from '~/components/pages/padavali/useListedPuzzlesDisplay';

type Trpc = ReturnType<typeof useTRPC>;

/** Admin catalog queries plus the public puzzle lists those edits change. */
export function invalidateCatalogQueries(queryClient: QueryClient, trpc: Trpc) {
  void queryClient.invalidateQueries(trpc.catalog.pathFilter());
  void queryClient.invalidateQueries({ queryKey: ['puzzle_list'] });
  void queryClient.invalidateQueries({ queryKey: ['puzzle_list_links'] });
  void queryClient.invalidateQueries({ queryKey: ['crossword_list'] });
  void queryClient.invalidateQueries({ queryKey: ['crossword_list_links'] });
  invalidatePadavaliListedPuzzleQueries(queryClient);
  invalidatePadajalaListedPuzzleQueries(queryClient);
}

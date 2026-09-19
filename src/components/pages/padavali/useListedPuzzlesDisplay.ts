'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useContext, useMemo } from 'react';
import { transliterate } from 'lipilekhika';
import { AppContext } from '~/components/AppDataContext';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import type { PadavaliListedPuzzlesType } from '~/util/cache.server/padavali_cache';
import {
  mapListedPuzzlesForDisplay,
  mergeDisplayPuzzles,
  NORMAL_TITLE_SCRIPT,
  type DisplayPuzzle
} from '~/components/pages/padavali/listed_puzzle_display';

/** Prefix for browse transliteration caches. Invalidate after list content changes. */
export const listedPuzzleQueryKey = ['listed_puzzle'] as const;

const listedPuzzlesCarouselQueryKey = ['listed_puzzles_carousel'] as const;

/** Call after `router.invalidate()` so refetch closes over fresh loader props. */
export function invalidatePadavaliListedPuzzleQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: listedPuzzleQueryKey });
  void queryClient.invalidateQueries({ queryKey: listedPuzzlesCarouselQueryKey });
}

/**
 * Devanagari list stays in props (loader). React Query only caches:
 * - `['listed_puzzle', 'normal']` — Normal titles for search
 * - `['listed_puzzle', script]` — per-script display rows
 *
 * Bust these via `invalidatePadavaliListedPuzzleQueries` after edits (not via key fingerprints).
 */
export function useListedPuzzlesDisplay(
  listed_puzzles: PadavaliListedPuzzlesType,
  listed_puzzles_init_transliterated: DisplayPuzzle[]
): DisplayPuzzle[] {
  const { script } = useContext(AppContext);

  const normal_titles_q = useQuery({
    queryKey: [...listedPuzzleQueryKey, 'normal'],
    queryFn: () =>
      transliterate(
        listed_puzzles.map((p) => p.title),
        DEFAULT_DATA_SCRIPT,
        NORMAL_TITLE_SCRIPT,
        {
          'all_to_normal:replace_avagraha_with_a': true,
          'all_to_normal:replace_pancham_varga_varna_with_n': true
        }
      ),
    initialData: listed_puzzles_init_transliterated.every((p) => p.title_normal != null)
      ? listed_puzzles_init_transliterated.map((p) => p.title_normal)
      : undefined,
    staleTime: Infinity
  });

  const script_display_q = useQuery({
    queryKey: [...listedPuzzleQueryKey, script],
    queryFn: async () => {
      const puzzle_texts = listed_puzzles.flatMap((p) =>
        p.description ? [p.title, p.description] : [p.title]
      );
      const transliterated_texts = await transliterate(puzzle_texts, DEFAULT_DATA_SCRIPT, script);
      return mapListedPuzzlesForDisplay(
        listed_puzzles,
        transliterated_texts,
        normal_titles_q.data!
      );
    },
    placeholderData: listed_puzzles_init_transliterated,
    enabled: normal_titles_q.data !== undefined,
    staleTime: Infinity
  });

  return useMemo(
    () =>
      mergeDisplayPuzzles(
        script_display_q.data ?? listed_puzzles_init_transliterated,
        listed_puzzles,
        normal_titles_q.data
      ),
    [
      script_display_q.data,
      listed_puzzles_init_transliterated,
      listed_puzzles,
      normal_titles_q.data
    ]
  );
}

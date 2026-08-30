'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
import type { CrossWordEntry } from '~/util/cross_word/game_model';

export function useMoreHints(
  puzzle_id: number | undefined,
  puzzle_slug: string | null | undefined,
  entries: CrossWordEntry[] | undefined
) {
  const trpc = useTRPC();
  const enabled = puzzle_id !== undefined && !!puzzle_slug;

  // Fetch as soon as the puzzle mounts — AI-generated hints can take a while on
  // first request, so we warm the cache early. UI components gate *display* only.
  const query = useQuery(
    trpc.public_ai.get_crossword_more_hints.queryOptions(
      {
        puzzle_id: puzzle_id!,
        puzzle_slug: puzzle_slug!
      },
      {
        enabled,
        staleTime: Infinity
      }
    )
  );

  const hintByEntryId = useMemo(() => {
    const hints = query.data?.hints;
    if (!hints || !entries?.length) {
      // SAFETY: empty map keeps the memo type uniform with the built map below
      return {} as Record<string, string>;
    }

    const map: Record<string, string> = {};
    for (let i = 0; i < entries.length; i++) {
      const hint = hints[i];
      if (hint) map[entries[i]!.id] = hint;
    }
    return map;
  }, [query.data?.hints, entries]);

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    hintByEntryId
  };
}

export type MoreHintsQuery = ReturnType<typeof useMoreHints>;

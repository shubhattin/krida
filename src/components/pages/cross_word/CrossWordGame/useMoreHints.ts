'use client';

import { useMemo } from 'react';
import { client_q } from '~/api/client';
import type { CrossWordEntry } from '~/util/cross_word/game_model';

export function useMoreHints(
  puzzle_id: number | undefined,
  puzzle_slug: string | null | undefined,
  entries: CrossWordEntry[] | undefined
) {
  const enabled = typeof puzzle_id === 'number' && !!puzzle_slug;

  // Fetch as soon as the puzzle mounts — AI-generated hints can take a while on
  // first request, so we warm the cache early. UI components gate *display* only.
  const query = client_q.public_ai.get_crossword_more_hints.useQuery(
    {
      puzzle_id: puzzle_id!,
      puzzle_slug: puzzle_slug!
    },
    {
      enabled,
      staleTime: Infinity
    }
  );

  const hintByEntryId = useMemo(() => {
    const hints = query.data?.hints;
    if (!hints || !entries?.length) return {} as Record<string, string>;

    const map: Record<string, string> = {};
    for (let i = 0; i < entries.length; i++) {
      const hint = hints[i];
      if (hint) map[entries[i]!.id] = hint;
    }
    return map;
  }, [query.data?.hints, entries]);

  return { ...query, hintByEntryId };
}

export type MoreHintsQuery = ReturnType<typeof useMoreHints>;

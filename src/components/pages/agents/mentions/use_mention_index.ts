import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
import { NORMAL_TITLE_SCRIPT } from '~/components/pages/padavali/listed_puzzle_display';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { transliterate_custom } from '~/tools/transliterator';
import { buildMentionIndex, type MentionablePuzzle } from './mention_search';

/**
 * Every puzzle for the `@` picker, loaded once on first use and searched in the browser.
 * Titles and descriptions are transliterated to Normal in one batch for romanized search.
 */
export function useMentionIndex(enabled: boolean) {
  const trpc = useTRPC();
  const list_q = useQuery(
    trpc.agents.list_mentionable_puzzles.queryOptions(undefined, {
      enabled,
      staleTime: 5 * 60_000
    })
  );
  const puzzles: MentionablePuzzle[] | undefined = list_q.data;

  const normal_q = useQuery({
    // Keyed by the list fetch: a refetched list gets transliterated again.
    // oxlint-disable-next-line query/exhaustive-deps
    queryKey: ['agent_mention_normal', list_q.dataUpdatedAt],
    queryFn: async () => {
      const list = puzzles ?? [];
      const texts = await transliterate_custom(
        [...list.map((puzzle) => puzzle.title), ...list.map((puzzle) => puzzle.description)],
        DEFAULT_DATA_SCRIPT,
        NORMAL_TITLE_SCRIPT
      );
      return { titles: texts.slice(0, list.length), descriptions: texts.slice(list.length) };
    },
    enabled: puzzles !== undefined,
    staleTime: Infinity
  });

  const index = useMemo(
    () => (puzzles ? buildMentionIndex(puzzles, normal_q.data) : null),
    [puzzles, normal_q.data]
  );

  return { index, loading: enabled && list_q.isPending, error: list_q.error };
}

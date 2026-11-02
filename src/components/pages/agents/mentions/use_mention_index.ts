import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
import { NORMAL_TITLE_SCRIPT } from '~/components/pages/padavali/listed_puzzle_display';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { transliterate_custom } from '~/tools/transliterator';
import {
  buildCollectionMentionIndex,
  buildMentionIndex,
  type MentionableCollection,
  type MentionablePuzzle
} from './mention_search';

/**
 * Everything the `@` picker can mention, loaded once on first use and searched in the
 * browser. Titles and descriptions are transliterated to Normal in one batch for
 * romanized search.
 */
export function useMentionIndex(enabled: boolean) {
  const trpc = useTRPC();
  const puzzles_q = useQuery(
    trpc.agents.list_mentionable_puzzles.queryOptions(undefined, {
      enabled,
      staleTime: 5 * 60_000
    })
  );
  const collections_q = useQuery(
    trpc.agents.list_mentionable_collections.queryOptions(undefined, {
      enabled,
      staleTime: 5 * 60_000
    })
  );
  const puzzles: MentionablePuzzle[] | undefined = puzzles_q.data;
  const collections: MentionableCollection[] | undefined = collections_q.data;

  const normal_q = useQuery({
    // Keyed by the list fetches: a refetched list gets transliterated again.
    // oxlint-disable-next-line query/exhaustive-deps
    queryKey: ['agent_mention_normal', puzzles_q.dataUpdatedAt, collections_q.dataUpdatedAt],
    queryFn: async () => {
      const puzzleList = puzzles ?? [];
      const collectionList = collections ?? [];
      const texts = await transliterate_custom(
        [
          ...puzzleList.map((puzzle) => puzzle.title),
          ...puzzleList.map((puzzle) => puzzle.description),
          ...collectionList.map((collection) => collection.title),
          ...collectionList.map((collection) => collection.description)
        ],
        DEFAULT_DATA_SCRIPT,
        NORMAL_TITLE_SCRIPT
      );
      const puzzleTitles = texts.slice(0, puzzleList.length);
      const puzzleDescriptions = texts.slice(puzzleList.length, puzzleList.length * 2);
      const collectionTitles = texts.slice(
        puzzleList.length * 2,
        puzzleList.length * 2 + collectionList.length
      );
      const collectionDescriptions = texts.slice(puzzleList.length * 2 + collectionList.length);
      return {
        puzzles: { titles: puzzleTitles, descriptions: puzzleDescriptions },
        collections: { titles: collectionTitles, descriptions: collectionDescriptions }
      };
    },
    enabled: puzzles !== undefined && collections !== undefined,
    staleTime: Infinity
  });

  const index = useMemo(
    () => (puzzles ? buildMentionIndex(puzzles, normal_q.data?.puzzles) : null),
    [puzzles, normal_q.data]
  );
  const collectionIndex = useMemo(
    () =>
      collections ? buildCollectionMentionIndex(collections, normal_q.data?.collections) : null,
    [collections, normal_q.data]
  );

  return {
    index,
    collectionIndex,
    loading: enabled && (puzzles_q.isPending || collections_q.isPending),
    error: puzzles_q.error ?? collections_q.error
  };
}

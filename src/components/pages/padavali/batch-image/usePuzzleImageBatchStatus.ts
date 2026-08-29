'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
import type { PuzzleImageGame } from '~/util/types/ai_batch_metadata';
import { puzzleImageBatchStatusQueryKey } from './query-keys';

export function usePuzzleImageBatchStatus(
  puzzle_id: number,
  enabled = true,
  game: PuzzleImageGame = 'padavali'
) {
  const trpc = useTRPC();

  return useQuery(
    trpc.batch_ai.get_puzzle_image_batch_status.queryOptions(
      { puzzle_id, game },
      {
        enabled,
        staleTime: 90_000,
        refetchOnWindowFocus: false
      }
    )
  );
}

export function useInvalidatePuzzleImageBatchQueries(game: PuzzleImageGame = 'padavali') {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidatePuzzleStatus = (puzzle_id: number) =>
    queryClient.invalidateQueries(
      trpc.batch_ai.get_puzzle_image_batch_status.queryFilter({ puzzle_id, game })
    );
  const invalidateBatchManager = () =>
    queryClient.invalidateQueries(trpc.batch_ai.get_batch_manager_groups.queryFilter({ game }));

  return {
    invalidatePuzzleStatus,
    invalidateBatchManager,
    invalidateAll: (puzzle_id?: number) =>
      Promise.all([
        puzzle_id !== undefined ? invalidatePuzzleStatus(puzzle_id) : Promise.resolve(),
        invalidateBatchManager()
      ])
  };
}

export { puzzleImageBatchStatusQueryKey };

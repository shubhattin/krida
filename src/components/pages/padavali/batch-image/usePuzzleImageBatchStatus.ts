'use client';

import { client_q } from '~/api/client';
import type { PuzzleImageGame } from '~/util/types/ai_batch_metadata';
import { puzzleImageBatchStatusQueryKey } from './query-keys';

export function usePuzzleImageBatchStatus(
  puzzle_id: number,
  enabled = true,
  game: PuzzleImageGame = 'padavali'
) {
  return client_q.batch_ai.get_puzzle_image_batch_status.useQuery(
    { puzzle_id, game },
    {
      enabled,
      staleTime: 90_000,
      refetchOnWindowFocus: false
    }
  );
}

export function useInvalidatePuzzleImageBatchQueries(game: PuzzleImageGame = 'padavali') {
  const utils = client_q.useUtils();

  return {
    invalidatePuzzleStatus: (puzzle_id: number) =>
      utils.batch_ai.get_puzzle_image_batch_status.invalidate({ puzzle_id, game }),
    invalidateBatchManager: () => utils.batch_ai.get_batch_manager_groups.invalidate({ game }),
    invalidateAll: (puzzle_id?: number) =>
      Promise.all([
        puzzle_id !== undefined
          ? utils.batch_ai.get_puzzle_image_batch_status.invalidate({ puzzle_id, game })
          : Promise.resolve(),
        utils.batch_ai.get_batch_manager_groups.invalidate({ game })
      ])
  };
}

export { puzzleImageBatchStatusQueryKey };

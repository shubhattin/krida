'use client';

import { client_q } from '~/api/client';
import { puzzleImageBatchStatusQueryKey } from './query-keys';

export function usePuzzleImageBatchStatus(puzzle_id: number, enabled = true) {
  return client_q.batch_ai.get_puzzle_image_batch_status.useQuery(
    { puzzle_id },
    {
      enabled,
      staleTime: 90_000,
      refetchOnWindowFocus: false
    }
  );
}

export function useInvalidatePuzzleImageBatchQueries() {
  const utils = client_q.useUtils();

  return {
    invalidatePuzzleStatus: (puzzle_id: number) =>
      utils.batch_ai.get_puzzle_image_batch_status.invalidate({ puzzle_id }),
    invalidateBatchManager: () => utils.batch_ai.get_batch_manager_groups.invalidate(),
    invalidateAll: (puzzle_id?: number) =>
      Promise.all([
        puzzle_id !== undefined
          ? utils.batch_ai.get_puzzle_image_batch_status.invalidate({ puzzle_id })
          : Promise.resolve(),
        utils.batch_ai.get_batch_manager_groups.invalidate()
      ])
  };
}

export { puzzleImageBatchStatusQueryKey };

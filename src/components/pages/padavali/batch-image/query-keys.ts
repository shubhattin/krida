import type { PuzzleImageGame } from '~/util/types/ai_batch_metadata';

export const PUZZLE_IMAGE_BATCH_STATUS_QUERY_KEY = 'puzzle_image_batch_status' as const;
export const BATCH_MANAGER_GROUPS_QUERY_KEY = 'batch_manager_groups' as const;

export const puzzleImageBatchStatusQueryKey = (
  puzzle_id: number,
  game: PuzzleImageGame = 'padavali'
) => [PUZZLE_IMAGE_BATCH_STATUS_QUERY_KEY, game, puzzle_id] as const;

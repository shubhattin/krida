export const PUZZLE_IMAGE_BATCH_STATUS_QUERY_KEY = 'puzzle_image_batch_status' as const;
export const BATCH_MANAGER_GROUPS_QUERY_KEY = 'batch_manager_groups' as const;

export const puzzleImageBatchStatusQueryKey = (puzzle_id: number) =>
  [PUZZLE_IMAGE_BATCH_STATUS_QUERY_KEY, puzzle_id] as const;

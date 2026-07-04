import type { BatchMetadata } from '~/util/types/ai_batch_metadata';

export type PuzzleImageBatchUiStatus = 'processing' | 'ready_for_review' | 'failed';

export function derivePuzzleImageBatchUiStatus(
  output_resolved: boolean,
  metadata: BatchMetadata,
  auto_approved: boolean
): PuzzleImageBatchUiStatus {
  if (!output_resolved) {
    return 'processing';
  }
  if (metadata.success === true && metadata.uploaded_image_id !== undefined && !auto_approved) {
    return 'ready_for_review';
  }
  return 'failed';
}

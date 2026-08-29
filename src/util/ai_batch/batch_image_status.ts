import type { BatchMetadata } from '~/util/types/ai_batch_metadata';

export type PuzzleImageBatchUiStatus =
  | 'processing'
  | 'ready_for_review'
  | 'auto_applying'
  | 'failed';

export const PUZZLE_IMAGE_BATCH_STATUS_LABELS: Record<PuzzleImageBatchUiStatus, string> = {
  processing: 'Processing',
  ready_for_review: 'Ready for review',
  auto_applying: 'Auto-applying',
  failed: 'Failed'
};

export const PUZZLE_IMAGE_BATCH_STATUS_VARIANTS: Record<
  PuzzleImageBatchUiStatus,
  'secondary' | 'default' | 'destructive'
> = {
  processing: 'secondary',
  ready_for_review: 'default',
  auto_applying: 'default',
  failed: 'destructive'
};

export function derivePuzzleImageBatchUiStatus(
  output_resolved: boolean,
  metadata: BatchMetadata,
  auto_approved: boolean
): PuzzleImageBatchUiStatus {
  if (!output_resolved) {
    return 'processing';
  }
  if (metadata.success === true && metadata.uploaded_image_id !== undefined) {
    if (auto_approved) {
      return 'auto_applying';
    }
    return 'ready_for_review';
  }
  return 'failed';
}

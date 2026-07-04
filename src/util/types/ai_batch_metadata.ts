import { z } from 'zod';
import ms from 'ms';

/*
# Image Workflow
- We poll on specifc intevrals and upload to the bukcet
- Store its reference in the metadata and then use it later
*/

/** Polling Interval for Batch API via QStash */
export const BATCH_POLLING_INTERVAL_MS = ms('10mins');

export const image_batch_metadata_schema = z.object({
  type: z.literal('image'),
  puzzle_id: z.number().int(),
  image_prompt: z.string(),
  file_name: z.string(),
  image_description: z.string(),
  /** to be editted upon batch completion */
  success: z.boolean().optional(),
  /** s3 uploaded image id (upload after successful batch completion) */
  uploaded_image_id: z.string().optional()
});

export const batch_metadata_schema = z.discriminatedUnion('type', [image_batch_metadata_schema]);
export type BatchMetadata = z.infer<typeof batch_metadata_schema>;

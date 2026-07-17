import type { z } from 'zod';
import { attachment_schema, DEFAULT_YOUTUBE_EMBED } from '~/db/db_shared_vals';

export type Attachment = z.infer<typeof attachment_schema>;

export function resolveAttachmentsWithDefaults(attachments: Attachment[]): Attachment[] {
  const list = attachments.map((v) => v);
  const default_attachment = {
    id: 0,
    ...DEFAULT_YOUTUBE_EMBED,
    order_index: 1
  } satisfies Attachment;

  if (list.length === 0) {
    return [default_attachment];
  }

  const any_youtube_embed = list.some((v) => v.type === 'youtube_embed');
  if (!any_youtube_embed) {
    list.push({
      ...default_attachment,
      order_index: list.length + 1
    });
  }

  return list;
}

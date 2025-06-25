import { z } from 'zod';

export const ATTACHMENT_TYPE_LIST = [
  'link',
  'youtube_video',
  'youtube_playlist',
  'youtube_embed'
] as const;
export type attachment_list_type = (typeof ATTACHMENT_TYPE_LIST)[number];
export const ATTACHMENT_TYPE_NAMES: Record<attachment_list_type, string> = {
  link: 'Link',
  youtube_video: 'Youtube Video',
  youtube_playlist: 'Youtube Playlist',
  youtube_embed: 'Youtube Embed'
};

export const DEFAULT_YOUTUBE_EMBED = {
  title: null,
  type: 'youtube_embed' as const,
  url: 'https://www.youtube.com/watch?v=YeC5P0-vxOQ'
};

export const attachment_schema = z.object({
  id: z.number().int(),
  type: z.enum(ATTACHMENT_TYPE_LIST),
  title: z.string().nullable(),
  url: z.string().url(),
  order_index: z.number().int()
});
export const puzzle_schema = z.object({
  id: z.number().int(),
  uuid: z.string().uuid(),
  title: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable(),
  word_list: z.string().min(2).array(),
  grid_data: z.string().min(1).array().array(),
  grid_dimensions: z.tuple([z.number().int(), z.number().int()]),
  archived: z.boolean(),
  description: z.string().nullable(),
  attachments: z.array(attachment_schema)
});

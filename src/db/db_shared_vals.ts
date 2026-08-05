import { z } from 'zod';
import { crossword_slug_schema, slug_schema } from '~/util/puzzle/slug';
import { padavali_word_candidate_list_schema } from '~/util/puzzle/word_list';

export { crossword_slug_schema, slug_schema };
export {
  padavali_word_candidate_schema,
  padavali_word_candidate_list_schema,
  type PadavaliWordCandidate
} from '~/util/puzzle/word_list';

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
  url: z.url(),
  order_index: z.number().int()
});
export const image_schema = z.object({
  id: z.number().int(),
  s3_key: z.string(),
  width: z.number().int(),
  height: z.number().int()
});

/** Public/cache Padavali puzzle — `word_list` is only enabled words as strings */
export const puzzle_schema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable(),
  word_list: z.string().array(),
  grid_data: z.string().array().array(),
  grid_dimensions: z.tuple([z.number().int(), z.number().int()]),
  listed: z.boolean(),
  description: z.string(),
  attachments: z.array(attachment_schema),
  image: image_schema.nullable()
});

/** Editor/DB Padavali puzzle — full candidate list with `added` flags */
export const puzzle_editor_schema = puzzle_schema.extend({
  word_list: padavali_word_candidate_list_schema
});

export const puzzle_update_input_schema = z.object({
  puzzle_id: z.number().int(),
  puzzle_slug: slug_schema,
  image_id: z.number().int().nullable(),
  puzzle_data: z.object({
    title: z.string(),
    listed: z.boolean(),
    word_list: padavali_word_candidate_list_schema,
    grid_data: z.string().array().array(),
    description: z.string().trim().min(1, 'Description is required'),
    attachments: attachment_schema
      .omit({ id: true })
      .extend({
        id: z.number().int().nullable()
      })
      .array()
  })
});

export const puzzle_add_input_schema = z.object({
  title: z.string().min(1),
  slug: slug_schema,
  description: z.string().default(''),
  override_redirect_slug: z.boolean().default(false)
});

export const puzzle_update_slug_input_schema = z.object({
  puzzle_id: z.number().int(),
  current_slug: slug_schema,
  new_slug: slug_schema,
  override_redirect_slug: z.boolean().default(false)
});

export const redirect_conflict_puzzle_schema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string()
});

export const redirect_conflict_schema = z.object({
  redirect_id: z.number().int(),
  redirect_slug: z.string(),
  puzzle: redirect_conflict_puzzle_schema
});

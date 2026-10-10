import { z } from 'zod';
import { SIMPLE_GAME_KINDS } from '~/util/games/kinds';

export const public_tag_schema = z.object({
  id: z.number().int(),
  slug: z.string()
});

export type PublicTag = z.infer<typeof public_tag_schema>;

export const GAME_KINDS = ['padavali', 'crossword', ...SIMPLE_GAME_KINDS] as const;
export type GameKind = (typeof GAME_KINDS)[number];

/** Lowercase slug: spaces become hyphens, anything outside `[a-z0-9_-]` is dropped. */
export const normalizeTagSlug = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const tag_slug_schema = z
  .string()
  .transform(normalizeTagSlug)
  .refine((slug) => slug.length > 0 && slug.length <= 80, {
    message: 'Tag slug must be 1–80 characters of lowercase letters, numbers, and hyphens'
  });

export const catalog_slug_schema = z
  .string()
  .transform((value) => normalizeTagSlug(value))
  .refine((slug) => slug.length > 0 && slug.length <= 100, {
    message: 'Slug must be 1–100 characters of lowercase letters, numbers, and hyphens'
  });

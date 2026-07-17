import { z } from 'zod';

export const MAX_SLUG_LENGTH = 100;

export const SLUG_REGEX = /^[a-z0-9_-]+$/;

/** First-segment paths under `/padavali/*` that must not be used as puzzle slugs. */
export const RESERVED_SLUGS = new Set([
  'analytics',
  'archived',
  'edit',
  'list',
  'puzzle',
  'puzzles',
  'schedules',
  'view'
]);

/** First-segment paths under `/padajala/*` that must not be used as puzzle slugs. */
export const CROSSWORD_RESERVED_SLUGS = new Set([
  'analytics',
  'archived',
  'batch_manager',
  'edit',
  'list',
  'puzzle',
  'puzzles',
  'schedules',
  'view'
]);

export const isReservedSlug = (slug: string) => RESERVED_SLUGS.has(slug);

export const isReservedCrosswordSlug = (slug: string) => CROSSWORD_RESERVED_SLUGS.has(slug);

export const normalizeSlug = (input: string) => input.trim().toLowerCase();

export const isValidSlug = (slug: string) =>
  slug.length > 0 &&
  slug.length <= MAX_SLUG_LENGTH &&
  SLUG_REGEX.test(slug) &&
  !isReservedSlug(slug);

export const slug_schema = z.string().transform(normalizeSlug).refine(isValidSlug, {
  message:
    'Slug may only contain lowercase letters, numbers, underscores, and dashes, and cannot match a reserved route name'
});

export const isValidCrosswordSlug = (slug: string) =>
  slug.length > 0 &&
  slug.length <= MAX_SLUG_LENGTH &&
  SLUG_REGEX.test(slug) &&
  !isReservedCrosswordSlug(slug);

export const crossword_slug_schema = z
  .string()
  .transform(normalizeSlug)
  .refine(isValidCrosswordSlug, {
    message:
      'Slug may only contain lowercase letters, numbers, underscores, and dashes, and cannot match a reserved route name'
  });

export const parseIdSlugParam = (param: string): { id: number; slug: string } | null => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(param);
  } catch {
    return null;
  }
  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) return null;

  const idStr = decoded.slice(0, colonIndex);
  const slug = decoded.slice(colonIndex + 1);
  if (!slug) return null;

  const id = Number.parseInt(idStr, 10);
  if (!Number.isInteger(id) || id < 1) return null;

  return { id, slug };
};

export const DEFAULT_GRID_DIMENSIONS: [number, number] = [6, 6];

export const createEmptyGridData = (dims: [number, number] = DEFAULT_GRID_DIMENSIONS) =>
  Array.from({ length: dims[0] }, () => Array.from({ length: dims[1] }, () => ''));

import { z } from 'zod';

export const MAX_SLUG_LENGTH = 100;

export const SLUG_REGEX = /^[a-z0-9_-]+$/;

/** First-segment paths reserved under every game tree. */
const SHARED_RESERVED_SLUGS = ['analytics', 'edit', 'list', 'puzzle', 'puzzles', 'view'] as const;

/** First-segment paths under `/padavali/*` that must not be used as puzzle slugs. */
export const RESERVED_SLUGS = new Set<string>([...SHARED_RESERVED_SLUGS, 'archived', 'schedules']);

/** First-segment paths under `/padajala/*` that must not be used as puzzle slugs. */
export const PADAJALA_RESERVED_SLUGS = new Set<string>([
  ...SHARED_RESERVED_SLUGS,
  'archived',
  'batch_manager',
  'schedules'
]);

/** First-segment paths under the simple-game trees. */
export const SIMPLE_GAME_RESERVED_SLUGS = new Set<string>(SHARED_RESERVED_SLUGS);

export const isReservedSlug = (slug: string) => RESERVED_SLUGS.has(slug);

export const isReservedPadajalaSlug = (slug: string) => PADAJALA_RESERVED_SLUGS.has(slug);

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

export const isValidPadajalaSlug = (slug: string) =>
  slug.length > 0 &&
  slug.length <= MAX_SLUG_LENGTH &&
  SLUG_REGEX.test(slug) &&
  !isReservedPadajalaSlug(slug);

export const padajala_slug_schema = z
  .string()
  .transform(normalizeSlug)
  .refine(isValidPadajalaSlug, {
    message:
      'Slug may only contain lowercase letters, numbers, underscores, and dashes, and cannot match a reserved route name'
  });

export const isReservedSimpleGameSlug = (slug: string) => SIMPLE_GAME_RESERVED_SLUGS.has(slug);

export const isValidSimpleGameSlug = (slug: string) =>
  slug.length > 0 &&
  slug.length <= MAX_SLUG_LENGTH &&
  SLUG_REGEX.test(slug) &&
  !isReservedSimpleGameSlug(slug);

export const simple_game_slug_schema = z
  .string()
  .transform(normalizeSlug)
  .refine(isValidSimpleGameSlug, {
    message:
      'Slug may only contain lowercase letters, numbers, underscores, and dashes, and cannot match a reserved route name'
  });

export const DEFAULT_GRID_DIMENSIONS: [number, number] = [6, 6];
export const PADAVALI_MIN_DIM = 4;
export const PADAVALI_MAX_DIM = 10;
export const PADAVALI_DIM_LIMITS = { min: PADAVALI_MIN_DIM, max: PADAVALI_MAX_DIM };

export const padavali_dimensions_schema = z.tuple([
  z.number().int().min(PADAVALI_MIN_DIM).max(PADAVALI_MAX_DIM),
  z.number().int().min(PADAVALI_MIN_DIM).max(PADAVALI_MAX_DIM)
]);

/** Rectangular grid whose sides are within the Padāvalī limits. */
export const isValidPadavaliGrid = (grid: string[][]) => {
  const cols = grid[0]?.length ?? 0;
  return (
    padavali_dimensions_schema.safeParse([grid.length, cols]).success &&
    grid.every((row) => row.length === cols)
  );
};

export const createEmptyGridData = (dims: [number, number] = DEFAULT_GRID_DIMENSIONS) =>
  Array.from({ length: dims[0] }, () => Array.from({ length: dims[1] }, () => ''));

import { eq } from 'drizzle-orm';
import { db, type transactionType } from '~/db/db';
import { crossword_redirects } from '~/db/schema';
import { isValidCrosswordSlug, normalizeSlug } from '~/util/puzzle/slug';

export type SlugAvailabilityOptions = {
  exclude_puzzle_id?: number;
};

export const resolve_slug_availability = async (
  slug: string,
  options: SlugAvailabilityOptions = {}
) => {
  const { exclude_puzzle_id } = options;
  const normalized = normalizeSlug(slug);
  if (!isValidCrosswordSlug(normalized)) {
    return { available: false as const, reason: 'invalid_format' as const, slug: normalized };
  }

  const [existing_puzzle, existing_redirect] = await Promise.all([
    db.query.crossword_puzzles.findFirst({
      where: (tbl, { eq: eqFn }) => eqFn(tbl.slug, normalized),
      columns: { id: true, slug: true, title: true }
    }),
    db.query.crossword_redirects.findFirst({
      where: (tbl, { eq: eqFn }) => eqFn(tbl.slug, normalized),
      with: {
        puzzle: {
          columns: { id: true, slug: true, title: true }
        }
      }
    })
  ]);

  if (
    existing_puzzle &&
    !(exclude_puzzle_id !== undefined && existing_puzzle.id === exclude_puzzle_id)
  ) {
    return {
      available: false as const,
      reason: 'taken' as const,
      slug: normalized,
      conflicting_puzzle: existing_puzzle
    };
  }

  if (
    existing_redirect?.puzzle &&
    !(exclude_puzzle_id !== undefined && existing_redirect.puzzle.id === exclude_puzzle_id)
  ) {
    return {
      available: true as const,
      slug: normalized,
      redirect_conflict: {
        redirect_id: existing_redirect.id,
        redirect_slug: existing_redirect.slug,
        puzzle: existing_redirect.puzzle
      }
    };
  }

  return { available: true as const, slug: normalized };
};

export const assert_slug_usable_for_mutation = async (
  slug: string,
  options: SlugAvailabilityOptions & { override_redirect_slug: boolean }
) => {
  const availability = await resolve_slug_availability(slug, options);

  if (!availability.available) {
    if (availability.reason === 'invalid_format') {
      throw new Error('Invalid slug format');
    }
    throw new Error('Slug is already taken by another puzzle');
  }

  if ('redirect_conflict' in availability && availability.redirect_conflict) {
    if (!options.override_redirect_slug) {
      throw new Error('Slug conflicts with an existing redirect; confirmation required');
    }
  }

  return availability;
};

export const delete_redirect_for_slug = async (tx: transactionType, slug: string) => {
  await tx.delete(crossword_redirects).where(eq(crossword_redirects.slug, slug));
};

export const upsert_redirect_for_puzzle = async (
  tx: transactionType,
  puzzle_id: number,
  redirect_slug: string
) => {
  await tx
    .insert(crossword_redirects)
    .values({
      puzzle_id,
      slug: redirect_slug
    })
    .onConflictDoUpdate({
      target: crossword_redirects.slug,
      set: { puzzle_id }
    });
};

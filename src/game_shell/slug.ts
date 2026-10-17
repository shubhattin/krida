import { Effect } from 'effect';
import { and, eq } from 'drizzle-orm';
import type { GameKind } from '~/util/catalog/tags';
import { puzzle_redirects, puzzles } from '~/db/schema';
import { dbRunHttp, type DbTransaction } from '~/effect/database';
import { BadRequestError, ConflictError } from '~/effect/errors';
import { normalizeSlug } from '~/util/puzzle/slug';

export type SlugAvailabilityOptions = {
  exclude_puzzle_id?: number;
};

type PuzzleSlugRow = { id: number; slug: string; title: string };

export function createGameSlugHelpers(options: {
  kind: GameKind;
  isValidSlug: (slug: string) => boolean;
}) {
  const { kind, isValidSlug } = options;

  const resolve_slug_availability = Effect.fn(`${kind}.resolve_slug_availability`)(function* (
    slug: string,
    availabilityOptions: SlugAvailabilityOptions = {}
  ) {
    const { exclude_puzzle_id } = availabilityOptions;
    const normalized = normalizeSlug(slug);
    if (!isValidSlug(normalized)) {
      return { available: false as const, reason: 'invalid_format' as const, slug: normalized };
    }

    const { existing_puzzle, existing_redirect } = yield* Effect.all({
      existing_puzzle: dbRunHttp(`${kind}_slug.find_puzzle_by_slug`, (client) =>
        client
          .select({
            id: puzzles.id,
            slug: puzzles.slug,
            title: puzzles.title
          })
          .from(puzzles)
          .where(and(eq(puzzles.kind, kind), eq(puzzles.slug, normalized)))
          .limit(1)
          .then((rows) => rows[0] as PuzzleSlugRow | undefined)
      ),
      existing_redirect: dbRunHttp(`${kind}_slug.find_redirect_by_slug`, async (client) => {
        const [redirect] = await client
          .select({
            id: puzzle_redirects.id,
            slug: puzzle_redirects.slug,
            puzzle_id: puzzle_redirects.puzzle_id
          })
          .from(puzzle_redirects)
          .where(and(eq(puzzle_redirects.kind, kind), eq(puzzle_redirects.slug, normalized)))
          .limit(1);
        if (!redirect) return undefined;
        const [puzzle] = await client
          .select({
            id: puzzles.id,
            slug: puzzles.slug,
            title: puzzles.title
          })
          .from(puzzles)
          .where(and(eq(puzzles.id, redirect.puzzle_id), eq(puzzles.kind, kind)))
          .limit(1);
        if (!puzzle) return undefined;
        return {
          id: redirect.id,
          slug: redirect.slug,
          puzzle_id: redirect.puzzle_id,
          puzzle
        };
      })
    });

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
  });

  const assert_slug_usable_for_mutation = Effect.fn(`${kind}.assert_slug_usable_for_mutation`)(
    function* (
      slug: string,
      mutationOptions: SlugAvailabilityOptions & { override_redirect_slug: boolean }
    ) {
      const availability = yield* resolve_slug_availability(slug, mutationOptions);

      if (!availability.available) {
        if (availability.reason === 'invalid_format') {
          return yield* Effect.fail(BadRequestError.make({ message: 'Invalid slug format' }));
        }
        return yield* Effect.fail(
          ConflictError.make({ message: 'Slug is already taken by another puzzle' })
        );
      }

      if ('redirect_conflict' in availability && availability.redirect_conflict) {
        if (!mutationOptions.override_redirect_slug) {
          return yield* Effect.fail(
            ConflictError.make({
              message: 'Slug conflicts with an existing redirect; confirmation required'
            })
          );
        }
      }

      return availability;
    }
  );

  const delete_redirect_for_slug = async (tx: DbTransaction, slug: string) => {
    await tx
      .delete(puzzle_redirects)
      .where(and(eq(puzzle_redirects.kind, kind), eq(puzzle_redirects.slug, slug)));
  };

  const upsert_redirect_for_puzzle = async (
    tx: DbTransaction,
    puzzle_id: number,
    redirect_slug: string
  ) => {
    await tx
      .insert(puzzle_redirects)
      .values({
        puzzle_id,
        kind,
        slug: redirect_slug
      })
      .onConflictDoUpdate({
        target: [puzzle_redirects.kind, puzzle_redirects.slug],
        set: { puzzle_id }
      });
  };

  return {
    resolve_slug_availability,
    assert_slug_usable_for_mutation,
    delete_redirect_for_slug,
    upsert_redirect_for_puzzle
  };
}

import { Effect } from 'effect';
import { eq } from 'drizzle-orm';
import { dbRunHttp, type DbTransaction } from '~/effect/database';
import { BadRequestError, ConflictError } from '~/effect/errors';
import { isValidSimpleGameSlug, normalizeSlug } from '~/util/puzzle/slug';
import type { SimpleGameKind } from '~/util/games/kinds';
import type { SimpleGameTableSet } from '~/db/schema/simple_game_tables';

export type SlugAvailabilityOptions = {
  exclude_puzzle_id?: number;
};

export function createSimpleGameSlugHelpers<TData>(
  kind: SimpleGameKind,
  tables: SimpleGameTableSet<TData>
) {
  const resolve_slug_availability = Effect.fn(`${kind}.resolve_slug_availability`)(function* (
    slug: string,
    options: SlugAvailabilityOptions = {}
  ) {
    const { exclude_puzzle_id } = options;
    const normalized = normalizeSlug(slug);
    if (!isValidSimpleGameSlug(normalized)) {
      return { available: false as const, reason: 'invalid_format' as const, slug: normalized };
    }

    const { existing_puzzle, existing_redirect } = yield* Effect.all({
      existing_puzzle: dbRunHttp(`${kind}_slug.find_puzzle_by_slug`, (client) =>
        client
          .select({
            id: tables.puzzles.id,
            slug: tables.puzzles.slug,
            title: tables.puzzles.title
          })
          .from(tables.puzzles)
          .where(eq(tables.puzzles.slug, normalized))
          .limit(1)
          .then((rows) => rows[0])
      ),
      existing_redirect: dbRunHttp(`${kind}_slug.find_redirect_by_slug`, async (client) => {
        const [redirect] = await client
          .select({
            id: tables.redirects.id,
            slug: tables.redirects.slug,
            puzzle_id: tables.redirects.puzzle_id
          })
          .from(tables.redirects)
          .where(eq(tables.redirects.slug, normalized))
          .limit(1);
        if (!redirect) return undefined;
        const [puzzle] = await client
          .select({
            id: tables.puzzles.id,
            slug: tables.puzzles.slug,
            title: tables.puzzles.title
          })
          .from(tables.puzzles)
          .where(eq(tables.puzzles.id, redirect.puzzle_id))
          .limit(1);
        return puzzle ? { ...redirect, puzzle } : undefined;
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
    function* (slug: string, options: SlugAvailabilityOptions & { override_redirect_slug: boolean }) {
      const availability = yield* resolve_slug_availability(slug, options);

      if (!availability.available) {
        if (availability.reason === 'invalid_format') {
          return yield* Effect.fail(BadRequestError.make({ message: 'Invalid slug format' }));
        }
        return yield* Effect.fail(
          ConflictError.make({ message: 'Slug is already taken by another puzzle' })
        );
      }

      if ('redirect_conflict' in availability && availability.redirect_conflict) {
        if (!options.override_redirect_slug) {
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
    await tx.delete(tables.redirects).where(eq(tables.redirects.slug, slug));
  };

  const upsert_redirect_for_puzzle = async (
    tx: DbTransaction,
    puzzle_id: number,
    redirect_slug: string
  ) => {
    await tx
      .insert(tables.redirects)
      .values({
        puzzle_id,
        slug: redirect_slug
      })
      .onConflictDoUpdate({
        target: tables.redirects.slug,
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

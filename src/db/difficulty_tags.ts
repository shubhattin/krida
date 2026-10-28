import { and, eq, inArray, type SQL } from 'drizzle-orm';
import type { DbTransaction } from '~/effect/database';
import {
  DIFFICULTY_COLLECTION_SLUGS,
  DIFFICULTY_TAG_SLUGS,
  difficultyForCollectionSlug
} from '~/util/catalog/difficulty';
import { collection_items, collections, puzzle_tags, puzzles, tags } from './schema';

export type MissingDifficultyTag = {
  puzzle_id: number;
  kind: (typeof puzzles.$inferSelect)['kind'];
  title: string;
  slug: string;
  tag_slug: string;
};

/** Insert the given tag slugs if missing and return all of their ids by slug. */
export const ensureTagSlugs = async (db: DbTransaction, slugs: readonly string[]) => {
  const unique = [...new Set(slugs)];
  if (unique.length === 0) return new Map<string, number>();
  await db
    .insert(tags)
    .values(unique.map((slug) => ({ slug })))
    .onConflictDoNothing({ target: tags.slug });
  const rows = await db
    .select({ id: tags.id, slug: tags.slug })
    .from(tags)
    .where(inArray(tags.slug, unique));
  return new Map(rows.map((row) => [row.slug, row.id]));
};

/**
 * Difficulty tags that puzzles in difficulty collections are missing. Narrow with
 * `puzzleIds` or `collectionId`; with neither, scans every difficulty collection.
 */
export const findMissingDifficultyTags = async (
  db: DbTransaction,
  filter: { puzzleIds?: number[]; collectionId?: number } = {}
): Promise<MissingDifficultyTag[]> => {
  if (filter.puzzleIds?.length === 0) return [];
  const conditions: SQL[] = [inArray(collections.slug, [...DIFFICULTY_COLLECTION_SLUGS])];
  if (filter.puzzleIds) conditions.push(inArray(collection_items.puzzle_id, filter.puzzleIds));
  if (filter.collectionId !== undefined) {
    conditions.push(eq(collection_items.collection_id, filter.collectionId));
  }
  const members = await db
    .select({
      puzzle_id: puzzles.id,
      kind: puzzles.kind,
      title: puzzles.title,
      slug: puzzles.slug,
      collection_slug: collections.slug
    })
    .from(collection_items)
    .innerJoin(collections, eq(collections.id, collection_items.collection_id))
    .innerJoin(puzzles, eq(puzzles.id, collection_items.puzzle_id))
    .where(and(...conditions))
    .orderBy(puzzles.id);
  if (members.length === 0) return [];

  const memberIds = [...new Set(members.map((row) => row.puzzle_id))];
  const existing = await db
    .select({ puzzle_id: puzzle_tags.puzzle_id, slug: tags.slug })
    .from(puzzle_tags)
    .innerJoin(tags, eq(tags.id, puzzle_tags.tag_id))
    .where(
      and(inArray(puzzle_tags.puzzle_id, memberIds), inArray(tags.slug, [...DIFFICULTY_TAG_SLUGS]))
    );
  const have = new Set(existing.map((row) => `${row.puzzle_id}:${row.slug}`));

  const missing = new Map<string, MissingDifficultyTag>();
  for (const { collection_slug, ...puzzle } of members) {
    const tag_slug = difficultyForCollectionSlug(collection_slug)?.tag_slug;
    if (!tag_slug) continue;
    const key = `${puzzle.puzzle_id}:${tag_slug}`;
    if (have.has(key) || missing.has(key)) continue;
    missing.set(key, { ...puzzle, tag_slug });
  }
  return [...missing.values()];
};

/** Link the given difficulty tags, creating the tag rows on the fly. */
export const addDifficultyTags = async (db: DbTransaction, missing: MissingDifficultyTag[]) => {
  if (missing.length === 0) return;
  const tagIds = await ensureTagSlugs(
    db,
    missing.map((row) => row.tag_slug)
  );
  await db
    .insert(puzzle_tags)
    .values(missing.map((row) => ({ puzzle_id: row.puzzle_id, tag_id: tagIds.get(row.tag_slug)! })))
    .onConflictDoNothing();
};

/**
 * Give every puzzle in a difficulty collection its matching difficulty tag. Call after any
 * collection-membership write. Returns the links it added.
 */
export const syncDifficultyTags = async (
  db: DbTransaction,
  filter: { puzzleIds?: number[]; collectionId?: number }
) => {
  const missing = await findMissingDifficultyTags(db, filter);
  await addDifficultyTags(db, missing);
  return missing;
};

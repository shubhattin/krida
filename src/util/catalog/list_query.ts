import { and, eq, inArray, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { collection_items, collections, puzzle_tags, puzzles, tags } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { Effect } from 'effect';
import type { GameKind, PublicTag } from './tags';

export const puzzleHasTag = (puzzleId: SQLWrapper, game: GameKind, slug: string): SQL =>
  sql`exists (
    select 1 from puzzle_tags pt
    inner join tags t on t.id = pt.tag_id
    inner join puzzles p on p.id = pt.puzzle_id
    where pt.puzzle_id = ${puzzleId} and p.kind = ${game} and t.slug = ${slug}
  )`;

export const puzzleInCollection = (
  puzzleId: SQLWrapper,
  game: GameKind,
  collectionId: number
): SQL =>
  sql`exists (
    select 1 from collection_items ci
    inner join puzzles p on p.id = ci.puzzle_id
    where ci.puzzle_id = ${puzzleId}
      and p.kind = ${game}
      and ci.collection_id = ${collectionId}
  )`;

export const puzzleNotInCollection = (
  puzzleId: SQLWrapper,
  game: GameKind,
  collectionId: number
): SQL =>
  sql`not exists (
    select 1 from collection_items ci
    inner join puzzles p on p.id = ci.puzzle_id
    where ci.puzzle_id = ${puzzleId}
      and p.kind = ${game}
      and ci.collection_id = ${collectionId}
  )`;

export const tagsForPuzzleIds = (game: GameKind, puzzleIds: number[]) => {
  if (puzzleIds.length === 0) {
    return Effect.succeed(new Map<number, PublicTag[]>());
  }
  return dbRunHttp(`${game}.tags_for_puzzle_ids`, (client) =>
    client
      .select({
        puzzle_id: puzzle_tags.puzzle_id,
        id: tags.id,
        slug: tags.slug
      })
      .from(puzzle_tags)
      .innerJoin(tags, eq(tags.id, puzzle_tags.tag_id))
      .innerJoin(puzzles, and(eq(puzzles.id, puzzle_tags.puzzle_id), eq(puzzles.kind, game)))
      .where(inArray(puzzle_tags.puzzle_id, puzzleIds))
      .orderBy(tags.slug)
  ).pipe(
    Effect.map((rows) => {
      const grouped = new Map<number, PublicTag[]>();
      for (const row of rows) {
        const current = grouped.get(row.puzzle_id) ?? [];
        current.push({ id: row.id, slug: row.slug });
        grouped.set(row.puzzle_id, current);
      }
      return grouped;
    })
  );
};

export type PuzzleCollectionRef = { id: number; uid: string; title: string };

/** Collections each puzzle belongs to, keyed by puzzle id (admin list rows). */
export const collectionsForPuzzleIds = (game: GameKind, puzzleIds: number[]) => {
  if (puzzleIds.length === 0) {
    return Effect.succeed(new Map<number, PuzzleCollectionRef[]>());
  }
  return dbRunHttp(`${game}.collections_for_puzzle_ids`, (client) =>
    client
      .select({
        puzzle_id: collection_items.puzzle_id,
        id: collections.id,
        uid: collections.uid,
        title: collections.title
      })
      .from(collection_items)
      .innerJoin(collections, eq(collections.id, collection_items.collection_id))
      .innerJoin(puzzles, and(eq(puzzles.id, collection_items.puzzle_id), eq(puzzles.kind, game)))
      .where(inArray(collection_items.puzzle_id, puzzleIds))
      .orderBy(collections.title)
  ).pipe(
    Effect.map((rows) => {
      const grouped = new Map<number, PuzzleCollectionRef[]>();
      for (const row of rows) {
        const current = grouped.get(row.puzzle_id) ?? [];
        current.push({ id: row.id, uid: row.uid, title: row.title });
        grouped.set(row.puzzle_id, current);
      }
      return grouped;
    })
  );
};

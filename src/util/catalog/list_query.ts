import { inArray, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { tags, padavali_puzzle_tags, crossword_puzzle_tags } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { Effect } from 'effect';
import type { GameKind, PublicTag } from './tags';

const LINK_TABLE = {
  padavali: 'padavali_puzzle_tags',
  crossword: 'crossword_puzzle_tags'
} as const;

const ITEM_TABLE = {
  padavali: 'padavali_collection_items',
  crossword: 'crossword_collection_items'
} as const;

export const puzzleHasTag = (puzzleId: SQLWrapper, game: GameKind, slug: string): SQL =>
  sql`exists (
    select 1 from ${sql.raw(LINK_TABLE[game])} pt
    inner join tags t on t.id = pt.tag_id
    where pt.puzzle_id = ${puzzleId} and t.slug = ${slug}
  )`;

export const puzzleInCollection = (
  puzzleId: SQLWrapper,
  game: GameKind,
  collectionId: number
): SQL =>
  sql`exists (
    select 1 from ${sql.raw(ITEM_TABLE[game])} ci
    where ci.puzzle_id = ${puzzleId} and ci.collection_id = ${collectionId}
  )`;

export const puzzleNotInCollection = (
  puzzleId: SQLWrapper,
  game: GameKind,
  collectionId: number
): SQL =>
  sql`not exists (
    select 1 from ${sql.raw(ITEM_TABLE[game])} ci
    where ci.puzzle_id = ${puzzleId} and ci.collection_id = ${collectionId}
  )`;

const linkTable = {
  padavali: padavali_puzzle_tags,
  crossword: crossword_puzzle_tags
} as const;

export const tagsForPuzzleIds = (game: GameKind, puzzleIds: number[]) => {
  if (puzzleIds.length === 0) {
    return Effect.succeed(new Map<number, PublicTag[]>());
  }
  const link = linkTable[game];
  return dbRunHttp(`${game}.tags_for_puzzle_ids`, (client) =>
    client
      .select({
        puzzle_id: link.puzzle_id,
        id: tags.id,
        slug: tags.slug,
        name: tags.name
      })
      .from(link)
      .innerJoin(tags, eq(tags.id, link.tag_id))
      .where(inArray(link.puzzle_id, puzzleIds))
      .orderBy(tags.slug)
  ).pipe(
    Effect.map((rows) => {
      const grouped = new Map<number, PublicTag[]>();
      for (const row of rows) {
        const current = grouped.get(row.puzzle_id) ?? [];
        current.push({ id: row.id, slug: row.slug, name: row.name });
        grouped.set(row.puzzle_id, current);
      }
      return grouped;
    })
  );
};

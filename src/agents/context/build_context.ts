import { Effect } from 'effect';
import { asc, count, desc, eq } from 'drizzle-orm';
import { dbRunHttp } from '~/effect/database';
import {
  collections,
  padajala_puzzles,
  padavali_puzzles,
  puzzle_tags,
  puzzles,
  tags
} from '~/db/schema';
import type { GameKind } from '~/util/catalog/tags';
import { collectionsForPuzzleIds, tagsForPuzzleIds } from '~/util/catalog/list_query';
import { SIMPLE_GAME_TABLES } from '~/util/catalog/simple_game_tables';
import type { SimpleGameKind } from '~/util/games/kinds';
import type { SimpleGameTableSet } from '~/db/schema/simple_game_tables';
import type { AgentContextSnapshot } from '~/agents/ui_message';
import {
  renderPuzzleContext,
  type ContextPuzzle,
  type ContextPuzzleContent
} from './render_context';

const puzzleMeta = {
  id: puzzles.id,
  slug: puzzles.slug,
  title: puzzles.title,
  description: puzzles.description,
  listed: puzzles.listed
};

/** Every puzzle of one game with its content, oldest first. Capped so new chats (and every
 * turn's frozen prefix) stay bounded as the catalog grows; beyond the cap the oldest drop off. */
const MAX_CONTEXT_PUZZLES = 500;

/** Newest-first from the DB, flipped back to oldest-first for stable prompt text. */
const oldestFirst = <T>(rows: T[]): T[] => rows.reverse();
const loadGamePuzzles = Effect.fn('agents.context.load_game_puzzles')(function* (kind: GameKind) {
  if (kind === 'padavali') {
    const rows = yield* dbRunHttp('agents.context.padavali', (client) =>
      client
        .select({
          ...puzzleMeta,
          word_list: padavali_puzzles.word_list,
          grid_dimensions: padavali_puzzles.grid_dimensions
        })
        .from(puzzles)
        .innerJoin(padavali_puzzles, eq(padavali_puzzles.id, puzzles.id))
        .orderBy(desc(puzzles.created_at))
        .limit(MAX_CONTEXT_PUZZLES)
    );
    return oldestFirst(rows).map(({ word_list, grid_dimensions, ...meta }) => ({
      meta,
      content: { kind, word_list, grid_dimensions } satisfies ContextPuzzleContent
    }));
  }
  if (kind === 'padajala') {
    const rows = yield* dbRunHttp('agents.context.padajala', (client) =>
      client
        .select({ ...puzzleMeta, word_list: padajala_puzzles.word_list })
        .from(puzzles)
        .innerJoin(padajala_puzzles, eq(padajala_puzzles.id, puzzles.id))
        .orderBy(desc(puzzles.created_at))
        .limit(MAX_CONTEXT_PUZZLES)
    );
    return oldestFirst(rows).map(({ word_list, ...meta }) => ({
      meta,
      content: { kind, word_list } satisfies ContextPuzzleContent
    }));
  }
  switch (kind) {
    case 'dvayi':
      return (yield* loadSimpleGameRows(kind, SIMPLE_GAME_TABLES.dvayi)).map(
        ({ puzzle_data, ...meta }) => ({ meta, content: { kind, data: puzzle_data } })
      );
    case 'bhramita':
      return (yield* loadSimpleGameRows(kind, SIMPLE_GAME_TABLES.bhramita)).map(
        ({ puzzle_data, ...meta }) => ({ meta, content: { kind, data: puzzle_data } })
      );
    case 'surupa':
      return (yield* loadSimpleGameRows(kind, SIMPLE_GAME_TABLES.surupa)).map(
        ({ puzzle_data, ...meta }) => ({ meta, content: { kind, data: puzzle_data } })
      );
    case 'anveshi':
      return (yield* loadSimpleGameRows(kind, SIMPLE_GAME_TABLES.anveshi)).map(
        ({ puzzle_data, ...meta }) => ({ meta, content: { kind, data: puzzle_data } })
      );
  }
});

function loadSimpleGameRows<TData>(kind: SimpleGameKind, tables: SimpleGameTableSet<TData>) {
  const table = tables.puzzles;
  return dbRunHttp(`agents.context.${kind}`, (client) =>
    client
      .select({ ...puzzleMeta, puzzle_data: table.puzzle_data })
      .from(puzzles)
      .innerJoin(table, eq(table.id, puzzles.id))
      .orderBy(desc(puzzles.created_at))
      .limit(MAX_CONTEXT_PUZZLES)
  ).pipe(Effect.map(oldestFirst));
}

/** Build the Puzzle Creator context for one game: its puzzles, plus every tag and collection. */
export const buildPuzzleContext = Effect.fn('agents.build_puzzle_context')(function* (
  kind: GameKind
) {
  const gamePuzzles = yield* loadGamePuzzles(kind);
  const ids = gamePuzzles.map((entry) => entry.meta.id);

  const { tagsByPuzzle, collectionsByPuzzle, tagRows, collectionRows } = yield* Effect.all(
    {
      tagsByPuzzle: tagsForPuzzleIds(kind, ids),
      collectionsByPuzzle: collectionsForPuzzleIds(kind, ids),
      tagRows: dbRunHttp('agents.context.tags', (client) =>
        client
          .select({ slug: tags.slug, usage: count(puzzle_tags.puzzle_id) })
          .from(tags)
          .leftJoin(puzzle_tags, eq(puzzle_tags.tag_id, tags.id))
          .groupBy(tags.id, tags.slug)
          .orderBy(asc(tags.slug))
      ),
      collectionRows: dbRunHttp('agents.context.collections', (client) =>
        client
          .select({
            id: collections.id,
            slug: collections.slug,
            title: collections.title,
            listed: collections.listed
          })
          .from(collections)
          .orderBy(asc(collections.id))
      )
    },
    { concurrency: 'unbounded' }
  );

  const contextPuzzles: ContextPuzzle[] = gamePuzzles.map(({ meta, content }) => ({
    ...meta,
    tags: (tagsByPuzzle.get(meta.id) ?? []).map((tag) => tag.slug),
    collection_ids: (collectionsByPuzzle.get(meta.id) ?? []).map((collection) => collection.id),
    content
  }));

  const text = renderPuzzleContext({
    game_kind: kind,
    puzzles: contextPuzzles,
    tags: tagRows.map((row) => ({ slug: row.slug, usage: Number(row.usage) })),
    collections: collectionRows
  });

  return {
    built_at: new Date().toISOString(),
    game_kind: kind,
    text,
    counts: {
      puzzles: contextPuzzles.length,
      tags: tagRows.length,
      collections: collectionRows.length
    }
  } satisfies AgentContextSnapshot;
});

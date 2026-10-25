import { Effect } from 'effect';
import { asc, count, desc, eq, inArray, type SQL } from 'drizzle-orm';
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
import type { AgentContextSnapshot, PuzzleRefData } from '~/agents/ui_message';
import {
  renderPuzzleContext,
  renderReferencedPuzzle,
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

/** Every puzzle of one game, or only `ids` of it (for `@` mentions). */
const loadGamePuzzles = Effect.fn('agents.context.load_game_puzzles')(function* (
  kind: GameKind,
  ids?: number[]
) {
  const onlyIds = ids ? inArray(puzzles.id, ids) : undefined;
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
        .where(onlyIds)
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
        .where(onlyIds)
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
      return (yield* loadSimpleGameRows(kind, SIMPLE_GAME_TABLES.dvayi, onlyIds)).map(
        ({ puzzle_data, ...meta }) => ({ meta, content: { kind, data: puzzle_data } })
      );
    case 'bhramita':
      return (yield* loadSimpleGameRows(kind, SIMPLE_GAME_TABLES.bhramita, onlyIds)).map(
        ({ puzzle_data, ...meta }) => ({ meta, content: { kind, data: puzzle_data } })
      );
    case 'surupa':
      return (yield* loadSimpleGameRows(kind, SIMPLE_GAME_TABLES.surupa, onlyIds)).map(
        ({ puzzle_data, ...meta }) => ({ meta, content: { kind, data: puzzle_data } })
      );
    case 'anveshi':
      return (yield* loadSimpleGameRows(kind, SIMPLE_GAME_TABLES.anveshi, onlyIds)).map(
        ({ puzzle_data, ...meta }) => ({ meta, content: { kind, data: puzzle_data } })
      );
  }
});

function loadSimpleGameRows<TData>(
  kind: SimpleGameKind,
  tables: SimpleGameTableSet<TData>,
  where: SQL | undefined
) {
  const table = tables.puzzles;
  return dbRunHttp(`agents.context.${kind}`, (client) =>
    client
      .select({ ...puzzleMeta, puzzle_data: table.puzzle_data })
      .from(puzzles)
      .innerJoin(table, eq(table.id, puzzles.id))
      .where(where)
      .orderBy(desc(puzzles.created_at))
      .limit(MAX_CONTEXT_PUZZLES)
  ).pipe(Effect.map(oldestFirst));
}

/** Puzzles of one game with their tags and collections, ready to render. */
const loadContextPuzzles = Effect.fn('agents.context.load_context_puzzles')(function* (
  kind: GameKind,
  onlyIds?: number[]
) {
  const gamePuzzles = yield* loadGamePuzzles(kind, onlyIds);
  const ids = gamePuzzles.map((entry) => entry.meta.id);
  const [tagsByPuzzle, collectionsByPuzzle] = yield* Effect.all(
    [tagsForPuzzleIds(kind, ids), collectionsForPuzzleIds(kind, ids)],
    { concurrency: 'unbounded' }
  );
  return gamePuzzles.map(({ meta, content }): ContextPuzzle => ({
    ...meta,
    tags: (tagsByPuzzle.get(meta.id) ?? []).map((tag) => tag.slug),
    collection_ids: (collectionsByPuzzle.get(meta.id) ?? []).map((collection) => collection.id),
    content
  }));
});

/** Build the Puzzle Creator context for one game: its puzzles, plus every tag and collection. */
export const buildPuzzleContext = Effect.fn('agents.build_puzzle_context')(function* (
  kind: GameKind
) {
  const { contextPuzzles, tagRows, collectionRows } = yield* Effect.all(
    {
      contextPuzzles: loadContextPuzzles(kind),
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

/**
 * Fill each `@` mention with its puzzle rendered for the model. Mentions of puzzles that no
 * longer exist are dropped.
 */
export const resolvePuzzleRefs = Effect.fn('agents.resolve_puzzle_refs')(function* (
  refs: PuzzleRefData[]
) {
  const idsByKind = new Map<GameKind, number[]>();
  for (const ref of refs) idsByKind.set(ref.kind, [...(idsByKind.get(ref.kind) ?? []), ref.id]);

  const loaded = yield* Effect.all(
    [...idsByKind].map(([kind, ids]) => loadContextPuzzles(kind, ids)),
    { concurrency: 'unbounded' }
  );
  const byKey = new Map(
    loaded.flat().map((puzzle) => [`${puzzle.content.kind}:${puzzle.id}`, puzzle])
  );

  return refs.flatMap((ref): PuzzleRefData[] => {
    const puzzle = byKey.get(`${ref.kind}:${ref.id}`);
    if (!puzzle) return [];
    return [
      {
        id: puzzle.id,
        kind: ref.kind,
        slug: puzzle.slug,
        title: puzzle.title,
        context: renderReferencedPuzzle(puzzle)
      }
    ];
  });
});

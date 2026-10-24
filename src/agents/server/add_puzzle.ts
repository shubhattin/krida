import { Effect } from 'effect';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  agent_chat_puzzles,
  collection_items,
  padajala_puzzles,
  padavali_puzzles,
  puzzle_tags,
  puzzles,
  tags
} from '~/db/schema';
import { dbRunHttp, dbTransaction, type DbTransaction } from '~/effect/database';
import { BadRequestError, ConflictError, NotFoundError } from '~/effect/errors';
import { SIMPLE_GAME_TABLES } from '~/util/catalog/simple_game_tables';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { refreshPuzzleSlugMap } from '~/util/cache.server/puzzle_slug_map_cache';
import { insertWithUniqueUid } from '~/util/puzzle/nano_id';
import { parsePuzzleDraft, type KindedPuzzleDraft } from '~/agents/drafts/schemas';
import { draftToGameData } from '~/agents/drafts/to_game_data';
import { checkDraftWithDatabase } from './draft_checks';
import { findAgentChat, loadAgentMessages } from './chat_store';

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.catch(() => Effect.void));

/** The draft as the agent proposed it, read from the stored chat — never from the client. */
export const findProposedDraft = Effect.fn('agents.find_proposed_draft')(function* (
  chatId: string,
  toolCallId: string
) {
  const chat = yield* findAgentChat(chatId);
  if (!chat.game_kind) {
    return yield* Effect.fail(
      BadRequestError.make({ message: 'This chat does not create puzzles' })
    );
  }
  const messages = yield* loadAgentMessages(chatId);
  const part = messages
    .flatMap((message) => message.parts)
    .find(
      (candidate) => candidate.type === 'tool-propose_puzzle' && candidate.toolCallId === toolCallId
    );
  if (!part || part.type !== 'tool-propose_puzzle' || part.state !== 'output-available') {
    return yield* Effect.fail(
      NotFoundError.make({
        resource: 'puzzle_proposal',
        message: 'Proposal not found in this chat'
      })
    );
  }
  const parsed = parsePuzzleDraft(chat.game_kind, part.input);
  if (!parsed) {
    return yield* Effect.fail(
      BadRequestError.make({ message: 'The proposal no longer matches the schema' })
    );
  }
  return { proposal: parsed, creator_options: chat.creator_options };
});

async function insertGameRow(tx: DbTransaction, id: number, input: KindedPuzzleDraft) {
  switch (input.kind) {
    case 'padavali':
      await tx.insert(padavali_puzzles).values({ id, ...draftToGameData.padavali(input.draft) });
      return;
    case 'padajala':
      await tx.insert(padajala_puzzles).values({ id, ...draftToGameData.padajala(input.draft) });
      return;
    case 'dvayi':
      await tx
        .insert(SIMPLE_GAME_TABLES.dvayi.puzzles)
        .values({ id, puzzle_data: draftToGameData.dvayi(input.draft) });
      return;
    case 'bhramita':
      await tx
        .insert(SIMPLE_GAME_TABLES.bhramita.puzzles)
        .values({ id, puzzle_data: draftToGameData.bhramita(input.draft) });
      return;
    case 'surupa':
      await tx
        .insert(SIMPLE_GAME_TABLES.surupa.puzzles)
        .values({ id, puzzle_data: draftToGameData.surupa(input.draft) });
      return;
    case 'anveshi':
      await tx
        .insert(SIMPLE_GAME_TABLES.anveshi.puzzles)
        .values({ id, puzzle_data: draftToGameData.anveshi(input.draft) });
      return;
  }
}

/**
 * Register an agent proposal as an unlisted draft: puzzle + game row, new tags, tag links,
 * collection links, and the chat ↔ puzzle link — all in one transaction.
 */
export const addProposedPuzzle = Effect.fn('agents.add_proposed_puzzle')(function* (input: {
  chatId: string;
  toolCallId: string;
  slug?: string;
}) {
  const { proposal, creator_options } = yield* findProposedDraft(input.chatId, input.toolCallId);

  const [alreadyAdded] = yield* dbRunHttp('agents.find_added', (client) =>
    client
      .select({ puzzle_id: agent_chat_puzzles.puzzle_id })
      .from(agent_chat_puzzles)
      .where(
        and(
          eq(agent_chat_puzzles.chat_id, input.chatId),
          eq(agent_chat_puzzles.tool_call_id, input.toolCallId)
        )
      )
      .limit(1)
  );
  if (alreadyAdded) {
    return yield* Effect.fail(ConflictError.make({ message: 'This puzzle was already added' }));
  }

  const check = yield* checkDraftWithDatabase(proposal, {
    slugOverride: input.slug,
    creator_options
  });
  if (!check.ok) {
    return yield* Effect.fail(BadRequestError.make({ message: check.errors.join(' ') }));
  }

  const { draft, kind } = proposal;
  const tagSlugs = check.tags.map((tag) => tag.slug);
  const collectionIds = check.collections.map((collection) => collection.id);

  const puzzleId = yield* dbTransaction('agents.add_puzzle', async (tx) => {
    const [inserted] = await insertWithUniqueUid(tx, puzzles, async (scoped, uid) => {
      const rows = await scoped
        .insert(puzzles)
        .values({
          kind,
          uid,
          slug: check.slug,
          title: draft.title.trim(),
          description: draft.description.trim(),
          listed: false
        })
        .returning();
      if (rows[0]) await insertGameRow(scoped, rows[0].id, proposal);
      return rows;
    });
    if (!inserted) throw new Error('Failed to create puzzle');

    if (tagSlugs.length > 0) {
      await tx
        .insert(tags)
        .values(tagSlugs.map((slug) => ({ slug })))
        .onConflictDoNothing({ target: tags.slug });
      const tagRows = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(inArray(tags.slug, tagSlugs));
      await tx
        .insert(puzzle_tags)
        .values(tagRows.map((tag) => ({ puzzle_id: inserted.id, tag_id: tag.id })));
    }

    for (const collectionId of collectionIds) {
      const [row] = await tx
        .select({ value: sql<number>`coalesce(max(${collection_items.order_index}), 0)` })
        .from(collection_items)
        .where(eq(collection_items.collection_id, collectionId));
      await tx.insert(collection_items).values({
        collection_id: collectionId,
        puzzle_id: inserted.id,
        order_index: Number(row?.value ?? 0) + 1
      });
    }

    // The primary key makes a second add of the same proposal fail the whole transaction.
    await tx.insert(agent_chat_puzzles).values({
      chat_id: input.chatId,
      tool_call_id: input.toolCallId,
      puzzle_id: inserted.id
    });
    return inserted.id;
  });

  yield* settle(refreshPuzzleSlugMap());
  if (collectionIds.length > 0) {
    yield* settle(invalidate_and_refresh_cache(CACHE.catalog.listed_collections, NO_CACHE_PARAMS));
  }

  return { puzzle_id: puzzleId, kind, slug: check.slug, title: draft.title.trim() };
});

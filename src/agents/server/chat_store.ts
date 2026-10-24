import { Effect } from 'effect';
import { and, asc, count, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { agent_chat_puzzles, agent_chats, agent_messages, puzzles } from '~/db/schema';
import { dbRunHttp, dbTransaction } from '~/effect/database';
import { NotFoundError } from '~/effect/errors';
import type { GameKind } from '~/util/catalog/tags';
import type { AgentKind } from '~/agents/agent_kinds';
import { buildPuzzleContext } from '~/agents/context/build_context';
import { resolveCreatorOptions, type CreatorOptions } from '~/agents/creator_options';
import type { AgentModelId } from '~/agents/models';
import type { AgentUIMessage } from '~/agents/ui_message';

export type AgentChatRow = typeof agent_chats.$inferSelect;

export const createAgentChat = Effect.fn('agents.create_chat')(function* (input: {
  id: string;
  agent_kind: AgentKind;
  game_kind: GameKind | null;
  model: AgentModelId;
  user_id: string;
  creator_options?: Partial<CreatorOptions> | null;
}) {
  const game_kind = input.agent_kind === 'puzzle_creator' ? input.game_kind : null;
  const context_snapshot = game_kind ? yield* buildPuzzleContext(game_kind) : null;
  const creator_options = game_kind
    ? resolveCreatorOptions(game_kind, input.creator_options)
    : null;
  const [chat] = yield* dbRunHttp('agents.insert_chat', (client) =>
    client
      .insert(agent_chats)
      .values({ ...input, game_kind, context_snapshot, creator_options })
      .returning()
  );
  return chat!;
});

export const listAgentChats = Effect.fn('agents.list_chats')(function* () {
  return yield* dbRunHttp('agents.list_chats', (client) =>
    client
      .select({
        id: agent_chats.id,
        title: agent_chats.title,
        agent_kind: agent_chats.agent_kind,
        game_kind: agent_chats.game_kind,
        updated_at: agent_chats.updated_at,
        streaming: agent_chats.streaming,
        puzzles_added: count(agent_chat_puzzles.tool_call_id)
      })
      .from(agent_chats)
      .leftJoin(agent_chat_puzzles, eq(agent_chat_puzzles.chat_id, agent_chats.id))
      .groupBy(agent_chats.id)
      .orderBy(desc(agent_chats.updated_at))
      .limit(300)
  );
});

export const findAgentChat = Effect.fn('agents.find_chat')(function* (id: string) {
  const [chat] = yield* dbRunHttp('agents.find_chat', (client) =>
    client.select().from(agent_chats).where(eq(agent_chats.id, id)).limit(1)
  );
  if (!chat) {
    return yield* Effect.fail(
      NotFoundError.make({ resource: 'agent_chat', message: 'Chat not found' })
    );
  }
  return chat;
});

export const loadAgentMessages = Effect.fn('agents.load_messages')(function* (chatId: string) {
  const rows = yield* dbRunHttp('agents.load_messages', (client) =>
    client
      .select({
        id: agent_messages.id,
        role: agent_messages.role,
        parts: agent_messages.parts,
        metadata: agent_messages.metadata
      })
      .from(agent_messages)
      .where(eq(agent_messages.chat_id, chatId))
      .orderBy(asc(agent_messages.position))
  );
  return rows.map((row): AgentUIMessage => ({
    id: row.id,
    role: row.role,
    parts: row.parts,
    metadata: row.metadata ?? undefined
  }));
});

/** Puzzles added from this chat, keyed by the `propose_puzzle` tool call. */
export const loadAddedPuzzles = Effect.fn('agents.load_added_puzzles')(function* (chatId: string) {
  return yield* dbRunHttp('agents.load_added_puzzles', (client) =>
    client
      .select({
        tool_call_id: agent_chat_puzzles.tool_call_id,
        puzzle_id: agent_chat_puzzles.puzzle_id,
        kind: puzzles.kind,
        slug: puzzles.slug,
        title: puzzles.title
      })
      .from(agent_chat_puzzles)
      .leftJoin(puzzles, eq(puzzles.id, agent_chat_puzzles.puzzle_id))
      .where(eq(agent_chat_puzzles.chat_id, chatId))
  );
});

/**
 * Make the stored conversation equal `messages`: upsert each, and drop rows a retry replaced
 * (a regenerated reply gets a new id).
 */
export const saveAgentMessages = Effect.fn('agents.save_messages')(function* (input: {
  chatId: string;
  messages: AgentUIMessage[];
  model: AgentModelId;
  title?: string;
}) {
  yield* dbTransaction('agents.save_messages', async (tx) => {
    // Message ids come from the client: ignore any that belong to another chat instead of
    // overwriting that chat's rows via the id-keyed upsert below.
    const incomingIds = input.messages.map((message) => message.id);
    const owned =
      incomingIds.length > 0
        ? await tx
            .select({ id: agent_messages.id, chat_id: agent_messages.chat_id })
            .from(agent_messages)
            .where(inArray(agent_messages.id, incomingIds))
        : [];
    const foreignIds = new Set(
      owned.filter((row) => row.chat_id !== input.chatId).map((row) => row.id)
    );
    const messages = input.messages.filter((message) => !foreignIds.has(message.id));
    if (messages.length > 0) {
      await tx
        .insert(agent_messages)
        .values(
          messages.map((message, position) => ({
            id: message.id,
            chat_id: input.chatId,
            role: message.role,
            parts: message.parts,
            metadata: message.metadata ?? null,
            position
          }))
        )
        .onConflictDoUpdate({
          target: agent_messages.id,
          set: {
            parts: sql`excluded.parts`,
            metadata: sql`excluded.metadata`,
            position: sql`excluded.position`
          }
        });
      await tx.delete(agent_messages).where(
        and(
          eq(agent_messages.chat_id, input.chatId),
          notInArray(
            agent_messages.id,
            messages.map((message) => message.id)
          )
        )
      );
    }
    await tx
      .update(agent_chats)
      .set({
        model: input.model,
        updated_at: new Date(),
        title: input.title || undefined
      })
      .where(eq(agent_chats.id, input.chatId));
  });
});

export const renameAgentChat = Effect.fn('agents.rename_chat')(function* (
  id: string,
  title: string
) {
  yield* dbRunHttp('agents.rename_chat', (client) =>
    client.update(agent_chats).set({ title }).where(eq(agent_chats.id, id)).returning()
  );
});

/** Mark a chat as (not) streaming — set when a reply starts, cleared when it lands or fails. */
export const setChatStreaming = Effect.fn('agents.set_streaming')(function* (
  id: string,
  streaming: boolean
) {
  yield* dbRunHttp('agents.set_streaming', (client) =>
    client.update(agent_chats).set({ streaming }).where(eq(agent_chats.id, id)).returning()
  );
});

export const deleteAgentChat = Effect.fn('agents.delete_chat')(function* (id: string) {
  yield* dbRunHttp('agents.delete_chat', (client) =>
    client.delete(agent_chats).where(eq(agent_chats.id, id)).returning()
  );
});

/** Rebuild the frozen puzzle context. The next turn misses the prompt cache once. */
export const refreshAgentContext = Effect.fn('agents.refresh_context')(function* (id: string) {
  const chat = yield* findAgentChat(id);
  if (!chat.game_kind) return chat.context_snapshot;
  const snapshot = yield* buildPuzzleContext(chat.game_kind);
  yield* dbRunHttp('agents.save_context', (client) =>
    client
      .update(agent_chats)
      .set({ context_snapshot: snapshot })
      .where(eq(agent_chats.id, id))
      .returning()
  );
  return snapshot;
});

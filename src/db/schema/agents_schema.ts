import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { AGENT_KINDS } from '~/agents/agent_kinds';
import type { CreatorOptions } from '~/agents/creator_options';
import type { AgentModelId } from '~/agents/models';
import type {
  AgentContextSnapshot,
  AgentMessageMetadata,
  AgentUIMessage
} from '~/agents/ui_message';
import { game_kind_enum, puzzles } from './puzzles_schema';

export const agent_kind_enum = pgEnum('agent_kind', AGENT_KINDS);

/** One admin agent conversation (`/admin/agents/$chatId`). */
export const agent_chats = pgTable(
  'agent_chats',
  {
    /** Same id `useChat` uses on the client. */
    id: text().primaryKey(),
    agent_kind: agent_kind_enum().notNull(),
    /** Puzzle creator only: the game it writes puzzles for. */
    game_kind: game_kind_enum(),
    /** Model of the latest turn; can change mid-chat. */
    model: text().notNull().$type<AgentModelId>(),
    title: text().notNull().default(''),
    /** Better Auth user id of the admin who started the chat. */
    user_id: text().notNull(),
    /** True while a reply is streaming for this chat (possibly in the background). */
    streaming: boolean().notNull().default(false),
    /** Puzzle creator only: starting options (word count, grid…) the system prompt defaults to. */
    creator_options: jsonb().$type<CreatorOptions>(),
    /**
     * Puzzle context the agent saw, frozen so every turn shares one cacheable prefix.
     * Rebuilt only by "Refresh context".
     */
    context_snapshot: jsonb().$type<AgentContextSnapshot>(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Bumped on every turn; sorts the sidebar. */
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('agent_chats_updated_at_idx').on(table.updated_at)]
);

/** Full UI messages: text, reasoning, and every tool call with its input and output. */
export const agent_messages = pgTable(
  'agent_messages',
  {
    id: text().primaryKey(),
    chat_id: text()
      .notNull()
      .references(() => agent_chats.id, { onDelete: 'cascade' }),
    role: text().notNull().$type<AgentUIMessage['role']>(),
    /** `UIMessage.parts`, stored as-is (validated against the tools before every save). */
    parts: jsonb().notNull().$type<AgentUIMessage['parts']>(),
    metadata: jsonb().$type<AgentMessageMetadata>(),
    /** Order within the chat. */
    position: integer().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('agent_messages_chat_id_position_idx').on(table.chat_id, table.position)]
);

/** Puzzles registered from a `propose_puzzle` tool call. One add per tool call. */
export const agent_chat_puzzles = pgTable(
  'agent_chat_puzzles',
  {
    chat_id: text()
      .notNull()
      .references(() => agent_chats.id, { onDelete: 'cascade' }),
    tool_call_id: text().notNull(),
    /** Null once the puzzle is deleted; the row still marks the chat as productive. */
    puzzle_id: integer().references(() => puzzles.id, { onDelete: 'set null' }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.chat_id, table.tool_call_id] }),
    index('agent_chat_puzzles_puzzle_id_idx').on(table.puzzle_id)
  ]
);

export const agent_chatsRelations = relations(agent_chats, ({ many }) => ({
  messages: many(agent_messages),
  puzzles: many(agent_chat_puzzles)
}));

export const agent_messagesRelations = relations(agent_messages, ({ one }) => ({
  chat: one(agent_chats, {
    fields: [agent_messages.chat_id],
    references: [agent_chats.id]
  })
}));

export const agent_chat_puzzlesRelations = relations(agent_chat_puzzles, ({ one }) => ({
  chat: one(agent_chats, {
    fields: [agent_chat_puzzles.chat_id],
    references: [agent_chats.id]
  }),
  puzzle: one(puzzles, {
    fields: [agent_chat_puzzles.puzzle_id],
    references: [puzzles.id]
  })
}));

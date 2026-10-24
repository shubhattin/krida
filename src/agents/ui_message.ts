import type { UIDataTypes, UIMessage } from 'ai';
import type { GameKind } from '~/util/catalog/tags';
import type { PuzzleDraft } from './drafts/schemas';
import type { AgentModelId } from './models';

/**
 * Wire types shared by the server tools and the chat UI. Kept free of runtime imports so the
 * client never pulls server code in.
 */

export type SqlQueryInput = {
  /** Few-word label shown on the collapsed tool row, e.g. "Puzzles per game". */
  purpose: string;
  query: string;
};

/** Cell as JSON text for the model: dates ISO, bigints and JSON values as text. */
export type SqlCell = string | number | boolean | null;

export type SqlQueryOutput = {
  columns: string[];
  rows: SqlCell[][];
  row_count: number;
  /** More rows (or bytes) existed than were returned. */
  truncated: boolean;
  duration_ms: number;
};

export type WebSearchInput = { query: string };

export type WebSearchOutput = {
  summary: string;
  sources: { url: string; title?: string }[];
};

export type ProposePuzzleOutput = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Normalized slug the puzzle would be saved under. */
  slug: string;
  tags: { slug: string; is_new: boolean }[];
  collections: { id: number; title: string }[];
};

export type AgentUITools = {
  sql_query: { input: SqlQueryInput; output: SqlQueryOutput };
  web_search: { input: WebSearchInput; output: WebSearchOutput };
  propose_puzzle: { input: PuzzleDraft; output: ProposePuzzleOutput };
};

export type AgentMessageMetadata = {
  model?: AgentModelId;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    reasoningTokens?: number;
  };
};

export type AgentUIMessage = UIMessage<AgentMessageMetadata, UIDataTypes, AgentUITools>;

/** The frozen puzzle context of a Puzzle Creator chat. */
export type AgentContextSnapshot = {
  built_at: string;
  game_kind: GameKind;
  text: string;
  counts: { puzzles: number; tags: number; collections: number };
};

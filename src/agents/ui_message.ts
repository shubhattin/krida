import type { UIMessage } from 'ai';
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
  /** USD charged for the search call (counted in the reply's cost) */
  cost?: number;
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
  /**
   * USD actually charged for this reply (every model step plus web searches), as reported by
   * OpenRouter. Summed across the requests of a reply.
   */
  cost?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    reasoningTokens?: number;
  };
};

/**
 * A puzzle the admin mentioned with `@` in a user message. The client sends the reference;
 * the server fills `context` (the puzzle rendered for the model) once, when the message is
 * first received, so history stays byte-stable for prompt caching.
 */
export type PuzzleRefData = {
  id: number;
  kind: GameKind;
  slug: string;
  title: string;
  context?: string;
};

/**
 * A collection the admin mentioned with `@collection/<slug>`. Same lifecycle as a puzzle
 * ref, but the rendered `context` is the collection's metadata plus its member roster —
 * never the members' full contents (the model fetches those with `sql_query` as needed).
 */
export type CollectionRefData = {
  id: number;
  uid: string;
  slug: string;
  title: string;
  context?: string;
};

/** Any `@` mention carried on a user message. Discriminated by the presence of `kind`. */
export type MentionRefData = PuzzleRefData | CollectionRefData;

export type AgentDataTypes = { puzzle_ref: PuzzleRefData; collection_ref: CollectionRefData };

export type AgentUIMessage = UIMessage<AgentMessageMetadata, AgentDataTypes, AgentUITools>;

/** The frozen puzzle context of a Puzzle Creator chat. */
export type AgentContextSnapshot = {
  built_at: string;
  game_kind: GameKind;
  text: string;
  counts: { puzzles: number; tags: number; collections: number };
};

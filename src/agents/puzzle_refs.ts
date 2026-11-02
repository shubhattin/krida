import type { DataUIPart, TextPart } from 'ai';
import { z } from 'zod';
import { game_kind_schema } from '~/util/catalog/tags';
import type {
  AgentDataTypes,
  AgentUIMessage,
  CollectionRefData,
  MentionRefData,
  PuzzleRefData
} from '~/agents/ui_message';

/** Puzzles one message may mention with `@`; each adds its full content to the prompt. */
export const MAX_PUZZLE_REFS = 8;

/** Collections one message may mention; each adds its metadata + member roster. */
export const MAX_COLLECTION_REFS = 4;

export const puzzle_ref_schema = z.object({
  id: z.number().int().positive(),
  kind: game_kind_schema,
  slug: z.string().max(200),
  title: z.string().max(500),
  context: z.string().optional()
});

export const collection_ref_schema = z.object({
  id: z.number().int().positive(),
  uid: z.string().max(32),
  slug: z.string().max(200),
  title: z.string().max(500),
  context: z.string().optional()
});

/** `dataSchemas` for `validateUIMessages`. */
export const AGENT_DATA_SCHEMAS = {
  puzzle_ref: puzzle_ref_schema,
  collection_ref: collection_ref_schema
};

/** How a mention reads inside the message text. */
export const mentionToken = (ref: MentionRefData): string =>
  'kind' in ref ? `@${ref.slug}` : `@collection/${ref.slug}`;

export const refKey = (ref: MentionRefData): string =>
  'kind' in ref ? `${ref.kind}:${ref.id}` : `collection:${ref.id}`;

/** Back-compat alias for the puzzle-only key. */
export const puzzleRefKey = (ref: Pick<PuzzleRefData, 'kind' | 'id'>) => `${ref.kind}:${ref.id}`;

export const collectionRefKey = (ref: Pick<CollectionRefData, 'id'>) => `collection:${ref.id}`;

export function messagePuzzleRefs(message: AgentUIMessage): PuzzleRefData[] {
  return message.parts.flatMap((part) => (part.type === 'data-puzzle_ref' ? [part.data] : []));
}

export function messageCollectionRefs(message: AgentUIMessage): CollectionRefData[] {
  return message.parts.flatMap((part) => (part.type === 'data-collection_ref' ? [part.data] : []));
}

export function messageMentionRefs(message: AgentUIMessage): MentionRefData[] {
  return [...messagePuzzleRefs(message), ...messageCollectionRefs(message)];
}

/** `convertDataPart` for `convertToModelMessages`: a mention becomes its rendered context. */
export function mentionRefToModelText(part: DataUIPart<AgentDataTypes>): TextPart | undefined {
  if (
    (part.type === 'data-puzzle_ref' || part.type === 'data-collection_ref') &&
    part.data.context
  ) {
    return { type: 'text', text: part.data.context };
  }
  return undefined;
}

/** Back-compat alias: puzzle mentions render the same way through the unified converter. */
export const puzzleRefToModelText = mentionRefToModelText;

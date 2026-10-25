import type { DataUIPart, TextPart } from 'ai';
import { z } from 'zod';
import { game_kind_schema } from '~/util/catalog/tags';
import type { AgentDataTypes, AgentUIMessage, PuzzleRefData } from './ui_message';

/** Puzzles one message may mention with `@`; each adds its full content to the prompt. */
export const MAX_PUZZLE_REFS = 8;

export const puzzle_ref_schema = z.object({
  id: z.number().int().positive(),
  kind: game_kind_schema,
  slug: z.string().max(200),
  title: z.string().max(500),
  context: z.string().optional()
});

/** `dataSchemas` for `validateUIMessages`. */
export const AGENT_DATA_SCHEMAS = { puzzle_ref: puzzle_ref_schema };

/** How a mention reads inside the message text. */
export const mentionToken = (ref: Pick<PuzzleRefData, 'slug'>) => `@${ref.slug}`;

export const puzzleRefKey = (ref: Pick<PuzzleRefData, 'kind' | 'id'>) => `${ref.kind}:${ref.id}`;

export function messagePuzzleRefs(message: AgentUIMessage): PuzzleRefData[] {
  return message.parts.flatMap((part) => (part.type === 'data-puzzle_ref' ? [part.data] : []));
}

/** `convertDataPart` for `convertToModelMessages`: a mention becomes its rendered puzzle. */
export function puzzleRefToModelText(part: DataUIPart<AgentDataTypes>): TextPart | undefined {
  if (part.type !== 'data-puzzle_ref' || !part.data.context) return undefined;
  return { type: 'text', text: part.data.context };
}

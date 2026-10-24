import { tool } from 'ai';
import type { GameKind } from '~/util/catalog/tags';
import { parsePuzzleDraft, PUZZLE_DRAFT_SCHEMAS, type PuzzleDraft } from '~/agents/drafts/schemas';
import { checkDraftWithDatabase } from '~/agents/server/draft_checks';
import type { ProposePuzzleOutput } from '~/agents/ui_message';
import { runToolEffect } from './run_tool_effect';

/**
 * The Puzzle Creator's structured output. The input schema is the game's draft schema; the
 * result tells the model whether the draft passed every check, so it can fix and retry in the
 * same turn. Nothing is saved here — the admin adds it from the card.
 */
export function createProposePuzzleTool(kind: GameKind) {
  return tool<PuzzleDraft, ProposePuzzleOutput>({
    description:
      'Propose one complete puzzle. It is checked (schema, game rules, slug, tags, collections) and shown to the admin as a card with an Add button. If ok is false, fix every error and call again.',
    inputSchema: PUZZLE_DRAFT_SCHEMAS[kind],
    execute: (draft) => {
      const proposal = parsePuzzleDraft(kind, draft);
      if (!proposal) throw new Error(`The input does not match the ${kind} puzzle schema.`);
      return runToolEffect(checkDraftWithDatabase(proposal));
    }
  });
}

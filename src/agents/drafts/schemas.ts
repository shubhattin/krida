import { z } from 'zod';
import type { GameKind } from '~/util/catalog/tags';
import { CREATOR_OPTION_FIELDS } from '~/agents/creator_options';

/**
 * What the Puzzle Creator writes — content only. Ids, akṣara splits, matches and grids are
 * derived in code (`to_game_data.ts`), so the model never has to get them right.
 * These schemas are also the `propose_puzzle` tool input, so `.describe()` text is model-facing.
 */
const draft_meta_fields = {
  title: z
    .string()
    .describe('Puzzle title, in the same style as the existing puzzles of this game'),
  description: z
    .string()
    .describe('One or two sentences shown under the title. May be empty if the title says it all.'),
  slug: z
    .string()
    .describe(
      'URL slug: lowercase a-z, 0-9 and hyphens only, unique among this game’s puzzles (see context)'
    ),
  tags: z
    .array(z.string())
    .describe(
      'Tag slugs (lowercase, hyphenated). Reuse existing tags whenever one fits; a new slug is created when the puzzle is added.'
    ),
  collection_ids: z
    .array(z.number().int())
    .describe('Ids of EXISTING collections this puzzle belongs in. Usually empty.')
};

const devanagari_word = z.string().describe('A word in Devanagari');

const grid_side = z.number().int().min(3).max(15);

export const padavali_draft_schema = z.object({
  ...draft_meta_fields,
  words: z
    .array(devanagari_word)
    .describe('The hidden words, in Devanagari. The grid is laid out later in the editor.'),
  grid_rows: grid_side.describe('Grid rows (see the chat defaults)'),
  grid_cols: grid_side.describe('Grid columns (see the chat defaults)')
});

export const padajala_draft_schema = z.object({
  ...draft_meta_fields,
  words: z
    .array(
      z.object({
        answer: z
          .string()
          .describe(
            'The crossword answer in plain Latin capitals A–Z, no spaces or diacritics (e.g. VYASA)'
          ),
        word_dev: z.string().describe('The same word in Devanagari (e.g. व्यास)'),
        clue: z.string().describe('The clue shown to the player, in English')
      })
    )
    .describe('Crossword entries. The grid is laid out later in the editor.')
});

export const dvayi_draft_schema = z.object({
  ...draft_meta_fields,
  pairs: z
    .array(
      z.object({
        left: z.string().describe('Left-column item'),
        right: z.string().describe('The right-column item it matches')
      })
    )
    .describe('Matching pairs. The game shuffles the right column.')
});

export const bhramita_draft_schema = z.object({
  ...draft_meta_fields,
  words: z
    .array(devanagari_word)
    .describe('Words to unscramble, in Devanagari. The game splits them into akṣaras.')
});

export const surupa_draft_schema = z.object({
  ...draft_meta_fields,
  words: z
    .array(
      z.object({
        word: devanagari_word,
        aksharas: z
          .array(
            z.object({
              akshara: z.string().describe('One akṣara of the word, in order'),
              alternatives: z
                .array(z.string())
                .describe(
                  'Plausible misspellings of this akṣara (usually 2), never the correct one'
                )
            })
          )
          .describe('The word split into akṣaras; joined in order they must spell the word exactly')
      })
    )
    .describe('Words whose spelling the player restores, akṣara by akṣara')
});

export const anveshi_draft_schema = z.object({
  ...draft_meta_fields,
  questions: z
    .array(
      z.object({
        prompt: z.string().describe('The question'),
        hint: z.string().describe('Optional nudge; empty string for none'),
        explanation: z.string().describe('Shown after answering'),
        options: z.array(z.string()).describe('Answer options (usually 4)'),
        correct_option_index: z.number().int().describe('0-based index of the correct option')
      })
    )
    .describe('Multiple-choice questions')
});

export const PUZZLE_DRAFT_SCHEMAS = {
  padavali: padavali_draft_schema,
  padajala: padajala_draft_schema,
  dvayi: dvayi_draft_schema,
  bhramita: bhramita_draft_schema,
  surupa: surupa_draft_schema,
  anveshi: anveshi_draft_schema
} as const satisfies Record<GameKind, z.ZodType>;

export type PuzzleDraftByKind = {
  [K in GameKind]: z.infer<(typeof PUZZLE_DRAFT_SCHEMAS)[K]>;
};

/** Draft of any game. Narrow with the chat's `game_kind`. */
export type PuzzleDraft = PuzzleDraftByKind[GameKind];

/** Draft tagged with its game, for code that handles every kind. */
export type KindedPuzzleDraft = {
  [K in GameKind]: { kind: K; draft: PuzzleDraftByKind[K] };
}[GameKind];

/** Narrow a stored `propose_puzzle` input to the chat's game, re-validating it. */
export function parsePuzzleDraft(kind: GameKind, input: PuzzleDraft): KindedPuzzleDraft | null {
  switch (kind) {
    case 'padavali': {
      // Proposals saved before drafts carried a grid size fall back to the default grid.
      const { grid_rows, grid_cols } = CREATOR_OPTION_FIELDS.padavali.defaults;
      const result = padavali_draft_schema.safeParse({ grid_rows, grid_cols, ...input });
      return result.success ? { kind, draft: result.data } : null;
    }
    case 'padajala': {
      const result = padajala_draft_schema.safeParse(input);
      return result.success ? { kind, draft: result.data } : null;
    }
    case 'dvayi': {
      const result = dvayi_draft_schema.safeParse(input);
      return result.success ? { kind, draft: result.data } : null;
    }
    case 'bhramita': {
      const result = bhramita_draft_schema.safeParse(input);
      return result.success ? { kind, draft: result.data } : null;
    }
    case 'surupa': {
      const result = surupa_draft_schema.safeParse(input);
      return result.success ? { kind, draft: result.data } : null;
    }
    case 'anveshi': {
      const result = anveshi_draft_schema.safeParse(input);
      return result.success ? { kind, draft: result.data } : null;
    }
  }
}

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
    .max(200)
    .describe('Puzzle title, in the same style as the existing puzzles of this game'),
  description: z
    .string()
    .max(2000)
    .describe('One or two sentences shown under the title. May be empty if the title says it all.'),
  slug: z
    .string()
    .max(100)
    .describe(
      'URL slug: lowercase a-z, 0-9 and hyphens only, unique among this game’s puzzles (see context)'
    ),
  tags: z
    .array(z.string().max(80))
    .max(20)
    .describe(
      'Tag slugs (lowercase, hyphenated). Reuse existing tags whenever one fits; a new slug is created when the puzzle is added.'
    ),
  collection_ids: z
    .array(z.number().int())
    .max(20)
    .describe('Ids of EXISTING collections this puzzle belongs in. Usually empty.')
};

const devanagari_word = z.string().max(60).describe('A word in Devanagari');

const grid_side = z.number().int().min(3).max(15);

export const padavali_draft_schema = z.object({
  ...draft_meta_fields,
  words: z
    .array(devanagari_word)
    .max(200)
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
          .max(60)
          .describe(
            'The crossword answer in plain Latin capitals A–Z, no spaces or diacritics (e.g. VYASA)'
          ),
        word_dev: z.string().max(60).describe('The same word in Devanagari (e.g. व्यास)'),
        clue: z.string().max(2000).describe('The clue shown to the player, in English')
      })
    )
    .max(200)
    .describe('Crossword entries. The grid is laid out later in the editor.')
});

export const dvayi_draft_schema = z.object({
  ...draft_meta_fields,
  pairs: z
    .array(
      z.object({
        left: z.string().max(500).describe('Left-column item'),
        right: z.string().max(500).describe('The right-column item it matches')
      })
    )
    .max(200)
    .describe('Matching pairs. The game shuffles the right column.')
});

export const bhramita_draft_schema = z.object({
  ...draft_meta_fields,
  words: z
    .array(devanagari_word)
    .max(200)
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
              akshara: z.string().max(20).describe('One akṣara of the word, in order'),
              alternatives: z
                .array(z.string().max(20))
                .max(10)
                .describe(
                  'Plausible misspellings of this akṣara (usually 2), never the correct one'
                )
            })
          )
          .max(40)
          .describe('The word split into akṣaras; joined in order they must spell the word exactly')
      })
    )
    .max(200)
    .describe('Words whose spelling the player restores, akṣara by akṣara')
});

export const anveshi_draft_schema = z.object({
  ...draft_meta_fields,
  questions: z
    .array(
      z.object({
        prompt: z.string().max(5000).describe('The question'),
        hint: z.string().max(2000).describe('Optional nudge; empty string for none'),
        explanation: z.string().max(5000).describe('Shown after answering'),
        options: z.array(z.string().max(2000)).max(10).describe('Answer options (usually 4)'),
        correct_option_index: z.number().int().describe('0-based index of the correct option')
      })
    )
    .max(200)
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

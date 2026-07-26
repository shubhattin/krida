import { openrouter } from './providers';
import { z } from 'zod';
import { generateText, Output } from 'ai';
import type { CrossWordPuzzleWord } from '~/db/schema_zod';

const text_model = openrouter('openai/gpt-5.6-luna');

/** Minimal puzzle shape needed to generate more hints. */
type MoreHintsPuzzleInput = {
  slug: string;
  title: string;
  description: string;
  word_list: CrossWordPuzzleWord[];
};

const SYSTEM_PROMPT = `
You are an expert crossword clue writer for Indian cultural, mythological, historical, and Sanskrit-themed puzzles.

You will be given:
- Title: The crossword puzzle title
- Description: The crossword puzzle description
- Entries: A numbered list of answer words with their existing short clues

Your task: For EACH entry, write ONE short, concise "more hint" that helps the solver without revealing the answer.

Rules:
- Return exactly one hint per entry, in the same order as the entries provided.
- Use the title and description only to enrich context — keep each hint brief (one short sentence or phrase).
- Do NOT include the answer word itself, any close spelling of it, or a direct transliteration of it.
- Do NOT give letter counts, first/last letters, anagrams, or other spelling-based reveals.
- Do NOT restate the answer as a dictionary definition that makes the word obvious.
- The hint should still feel like a clue: more helpful and contextual, but not a giveaway.
- It should extend the context provided the built-in short clue, and add more information which might be helpful.
- Prefer English; when referring to Indian names/concepts use IAST romanization (e.g. gaṇeśa), not Devanagari.

Give your response in the required JSON SCHEMA.
`;

export const more_hints_schema = z.object({
  hints: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .describe('Short enriched hint for one crossword entry; must not reveal the answer')
    )
    .describe('One enriched hint per crossword entry, in the same order as the input entries')
});

export type MoreHintsType = z.infer<typeof more_hints_schema>;

/** Fields that affect AI more-hints generation (placement is ignored). */
export type MoreHintsInputWord = Pick<CrossWordPuzzleWord, 'word' | 'description'>;

export const more_hints_inputs_equal = (
  a: { title: string; description: string; word_list: MoreHintsInputWord[] },
  b: { title: string; description: string; word_list: MoreHintsInputWord[] }
) => {
  if (a.title !== b.title || a.description !== b.description) return false;
  if (a.word_list.length !== b.word_list.length) return false;
  return a.word_list.every(
    (entry, i) =>
      entry.word === b.word_list[i]?.word && entry.description === b.word_list[i]?.description
  );
};

/** Extra attempts after the first failure (total attempts = 1 + MAX_RETRIES). */
const MAX_RETRIES = 2;

const generate_more_hints_once = async (puzzle: MoreHintsPuzzleInput): Promise<MoreHintsType> => {
  const entries = puzzle.word_list
    .map((entry, i) => `${i + 1}. Answer: ${entry.word}\n   Short clue: ${entry.description}`)
    .join('\n');

  const response = await generateText({
    model: text_model,
    system: SYSTEM_PROMPT,
    prompt: `Title: ${puzzle.title}\nDescription: ${puzzle.description}\n\nEntries:\n${entries}`,
    output: Output.object({ schema: more_hints_schema }),
    providerOptions: {
      openrouter: {
        reasoning: { effort: 'medium' }
      }
    }
  });

  const output = response.output;
  if (!output) {
    throw new Error(`More hints generation returned empty output for slug: ${puzzle.slug}`);
  }
  if (output.hints.length !== puzzle.word_list.length) {
    throw new Error(
      `More hints count mismatch for slug: ${puzzle.slug} (expected ${puzzle.word_list.length}, got ${output.hints.length})`
    );
  }

  return output;
};

export const get_crossword_more_hints = async (puzzle: MoreHintsPuzzleInput) => {
  let last_error: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generate_more_hints_once(puzzle);
    } catch (error) {
      last_error = error;
      if (attempt < MAX_RETRIES) {
        console.warn(
          `More hints generation failed for slug: ${puzzle.slug} (attempt ${attempt + 1}/${MAX_RETRIES + 1}); retrying…`,
          error
        );
      }
    }
  }

  throw last_error instanceof Error
    ? last_error
    : new Error(`More hints generation failed for slug: ${puzzle.slug}`);
};

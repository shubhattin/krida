import { Effect } from 'effect';
import { z } from 'zod';
import type { CrossWordPuzzleWord } from '~/db/schema_zod';
import { AiProvider, aiRetryPolicy } from '~/effect/ai';
import { AiProviderError } from '~/effect/errors';
import { OPENROUTER_MODELS } from '~/util/ai/image_gen';
import { crosswordActiveWords } from '~/util/puzzle/word_list';

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
export type MoreHintsInputWord = Pick<CrossWordPuzzleWord, 'word' | 'description'> &
  Partial<Pick<CrossWordPuzzleWord, 'added'>>;

export const more_hints_inputs_equal = (
  a: { title: string; description: string; word_list: MoreHintsInputWord[] },
  b: { title: string; description: string; word_list: MoreHintsInputWord[] }
) => {
  if (a.title !== b.title || a.description !== b.description) return false;
  const aWords = a.word_list.filter((entry) => entry.added !== false);
  const bWords = b.word_list.filter((entry) => entry.added !== false);
  if (aWords.length !== bWords.length) return false;
  return aWords.every(
    (entry, i) => entry.word === bWords[i]?.word && entry.description === bWords[i]?.description
  );
};

export const get_crossword_more_hints = Effect.fn('get_crossword_more_hints')(function* (
  puzzle: MoreHintsPuzzleInput
) {
  const ai = yield* AiProvider;
  const activeWords = crosswordActiveWords(puzzle.word_list);
  const entries = activeWords
    .map((entry, i) => `${i + 1}. Answer: ${entry.word}\n   Short clue: ${entry.description}`)
    .join('\n');

  const output = yield* Effect.gen(function* () {
    const result = yield* ai.generateObject({
      operation: 'more_hints',
      provider: 'openrouter',
      model: ai.openrouterModel(OPENROUTER_MODELS.more_hints),
      system: SYSTEM_PROMPT,
      prompt: `Title: ${puzzle.title}\nDescription: ${puzzle.description}\n\nEntries:\n${entries}`,
      schema: more_hints_schema,
      openrouterReasoningEffort: 'medium'
    });

    if (result.hints.length !== activeWords.length) {
      return yield* Effect.fail(
        AiProviderError.make({
          operation: 'more_hints',
          provider: 'openrouter',
          cause: new Error(
            `More hints count mismatch for slug: ${puzzle.slug} (expected ${activeWords.length}, got ${result.hints.length})`
          )
        })
      );
    }

    return result;
  }).pipe(Effect.retry(aiRetryPolicy));

  return output;
});

export type GetCrosswordMoreHintsError = AiProviderError;

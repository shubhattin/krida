import { Effect, Schedule } from 'effect';
import { AiProvider } from '~/effect/ai';
import { AiProviderError } from '~/effect/errors';
import { OPENROUTER_MODELS } from '~/util/ai/image_gen';
import { word_meanings_schema, type WordMeaningsType } from '~/util/ai/ai_content_schemas';

const SYSTEM_PROMPT = `
You are an expert at providing meanings of Sanskrit words based on the puzzle context.

You will be provided context of Sanskrit puzzle title and name.
- You have give short meanings and explanations for meaning of words of the puzzles.
- Keep In the context tHe indian cultural mythology, history  and background for explanation.
- Do not use Devanagari in word meanings rather use the IAST (Romanized standard to write Indian Sanskit words)
  for any other Sanskrit names you mention, eg :- śakti, gaṇeśa, kālabhairava
- Return every word exactly as provided (same Devanagari spelling), one entry per word, in the same order.
- The meaning is also shown to players as a hint while they are still searching for the word, so NEVER
  write the word itself in its meaning: not in Devanagari, not in IAST or any other romanization, not a
  close spelling, variant or part of it. Refer to it as "this word" or describe it instead.

You will be provided with
- Title: The title of the puzzle
- Description: The description of the puzzle
- Words: The words of the puzzle

Give your response in a proper JSON SCHEMA
`;

export { word_meanings_schema, type WordMeaningsType };

/**
 * Part of the stored input hash and the Redis key: bump after changing the prompt or model so
 * every puzzle's saved meanings count as stale and regenerate on next request.
 */
export const WORD_MEANINGS_PROMPT_VERSION = 2;

/** What word-meanings generation reads from a puzzle. */
export type WordMeaningsPuzzleInput = {
  slug: string;
  title: string;
  description: string;
  /** Active (public) words only */
  word_list: string[];
};

export const get_puzzle_word_meanings = Effect.fn('get_puzzle_word_meanings')(function* (
  puzzle: WordMeaningsPuzzleInput
) {
  const ai = yield* AiProvider;
  const words_list = puzzle.word_list.join(', ');

  const output = yield* Effect.gen(function* () {
    const result = yield* ai.generateObject({
      operation: 'word_meanings',
      provider: 'openrouter',
      model: ai.openrouterModel(OPENROUTER_MODELS.word_meanings),
      system: SYSTEM_PROMPT,
      prompt: `Title: ${puzzle.title}\nDescription: ${puzzle.description}\nWords: ${words_list}`,
      schema: word_meanings_schema,
      openrouterReasoningEffort: 'medium'
    });

    if (result.words.length !== puzzle.word_list.length) {
      return yield* Effect.fail(
        AiProviderError.make({
          operation: 'word_meanings',
          provider: 'openrouter',
          cause: new Error(
            `Word meanings count mismatch for slug: ${puzzle.slug} (expected ${puzzle.word_list.length}, got ${result.words.length})`
          )
        })
      );
    }

    return result;
  }).pipe(
    // Basic retry: each attempt is billed, so cap at 2 retries (3 total tries).
    // Covers transient failures and invalid output (e.g. word-count mismatch);
    // the underlying AI SDK already retries transient HTTP errors internally.
    Effect.retry(Schedule.recurs(2))
  );

  return output;
});

export type GetPuzzleWordMeaningsError = AiProviderError;

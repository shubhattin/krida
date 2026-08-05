import { Effect } from 'effect';
import { z } from 'zod';
import { puzzle_schema } from '~/db/db_shared_vals';
import { AiProvider, aiRetryPolicy } from '~/effect/ai';
import { AiProviderError } from '~/effect/errors';
import { OPENROUTER_MODELS } from '~/util/ai/image_gen';

type PuzzleType = z.infer<typeof puzzle_schema>;

const SYSTEM_PROMPT = `
You are an expert at providing meanings of Sanskrit words based on the puzzle context.

You will be provided context of Sanskrit puzzle title and name.
- You have give short meanings and explanations for meaning of words of the puzzles.
- Keep In the context tHe indian cultural mythology, history  and background for explanation.
- Do not use Devanagari in word meanings rather use the IAST (Romanized standard to write Indian Sanskit words), 
  eg :- śakti (शक्ति) , gaṇeṣa (गणेश), kālabhairava (कालभैरव)

You will be provided with
- Title: The title of the puzzle
- Description: The description of the puzzle
- Words: The words of the puzzle

Give your response in a proper JSON SCHEMA
`;

export const word_meanings_schema = z.object({
  words: z
    .array(
      z.object({
        word: z.string().describe('Provided Sanskrit word in Devanagari script'),
        meaning: z
          .string()
          .describe(
            'Meaning and Short Explanation of the word in English based on the puzzle context'
          )
      })
    )
    .describe('List of words and their meanings')
});

export type WordMeaningsType = z.infer<typeof word_meanings_schema>;

export const get_puzzle_word_meanings = Effect.fn('get_puzzle_word_meanings')(function* (
  puzzle: PuzzleType
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
  }).pipe(Effect.retry(aiRetryPolicy));

  return output;
});

export type GetPuzzleWordMeaningsError = AiProviderError;

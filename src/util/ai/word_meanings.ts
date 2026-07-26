import { openrouter } from './providers';
import { z } from 'zod';
import { puzzle_schema } from '~/db/db_shared_vals';
import { generateText, Output } from 'ai';

type PuzzleType = z.infer<typeof puzzle_schema>;

const text_model = openrouter('openai/gpt-5.6-luna');

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

export const get_puzzle_word_meanings = async (puzzle: PuzzleType) => {
  const words_list = puzzle.word_list.join(', ');
  const response = await generateText({
    model: text_model,
    system: SYSTEM_PROMPT,
    prompt: `Title: ${puzzle.title}\nDescription: ${puzzle.description}\nWords: ${words_list}`,
    output: Output.object({ schema: word_meanings_schema }),
    providerOptions: {
      openrouter: {
        reasoning: { effort: 'medium' }
      }
    }
  });
  return response.output;
};

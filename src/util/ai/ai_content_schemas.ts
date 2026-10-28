import { z } from 'zod';

/**
 * Output shapes of the persisted AI puzzle content (word meanings, more hints).
 * Kept free of server imports so DB schema / zod schema files can use them.
 */

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

export const more_hints_schema = z.object({
  hints: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .describe('Short enriched hint for one padajala entry; must not reveal the answer')
    )
    .describe('One enriched hint per padajala entry, in the same order as the input entries')
});

export type MoreHintsType = z.infer<typeof more_hints_schema>;

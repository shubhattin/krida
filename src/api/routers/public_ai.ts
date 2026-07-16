import { t, publicProcedure } from '../trpc_init';
import { z } from 'zod';
import { CACHE } from '~/util/cache.server/cache_loaders';
import { TRPCError } from '@trpc/server';

const word_meaning_schema = z.object({
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

const get_puzzle_word_meanings_route = publicProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      puzzle_slug: z.string()
    })
  )
  .output(word_meaning_schema)
  .query(async ({ input: { puzzle_id, puzzle_slug } }) => {
    const puzzle = await CACHE.padavali.word_puzzle.get({ slug: puzzle_slug });
    if (!puzzle || puzzle.id !== puzzle_id) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Puzzle not found' });
    }

    const response = await CACHE.padavali.word_meanings.get({ slug: puzzle_slug });
    return response;
  });

export const public_ai_router = t.router({
  get_puzzle_word_meanings: get_puzzle_word_meanings_route
});

import { Effect } from 'effect';
import { t, publicProcedure } from '../trpc_init';
import { z } from 'zod';
import { CACHE } from '~/util/cache.server/cache_loaders';
import { NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import { more_hints_schema } from '~/util/ai/more_hints';

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
  .query(({ input: { puzzle_id, puzzle_slug } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const puzzle = yield* CACHE.padavali.word_puzzle.get({ slug: puzzle_slug });
        if (!puzzle || puzzle.id !== puzzle_id) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padavali_puzzle',
              message: 'Puzzle not found'
            })
          );
        }

        return yield* CACHE.padavali.word_meanings.get({ slug: puzzle_slug });
      })
    )
  );

const get_crossword_more_hints_route = publicProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      puzzle_slug: z.string()
    })
  )
  .output(more_hints_schema)
  .query(({ input: { puzzle_id, puzzle_slug } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const puzzle = yield* CACHE.crossword.word_puzzle.get({ slug: puzzle_slug });
        if (!puzzle || puzzle.id !== puzzle_id) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'crossword_puzzle',
              message: 'Crossword puzzle not found'
            })
          );
        }

        return yield* CACHE.crossword.more_hints.get({ slug: puzzle_slug });
      })
    )
  );

export const public_ai_router = t.router({
  get_puzzle_word_meanings: get_puzzle_word_meanings_route,
  get_crossword_more_hints: get_crossword_more_hints_route
});

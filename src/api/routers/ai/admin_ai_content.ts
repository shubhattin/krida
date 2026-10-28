import { Effect } from 'effect';
import { z } from 'zod';
import { protectedAdminProcedure, t } from '~/api/trpc_init';
import { CACHE } from '~/util/cache.server/cache_loaders';
import { NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';
import { more_hints_schema, word_meanings_schema } from '~/util/ai/ai_content_schemas';

const puzzle_input = z.object({ puzzle_id: z.number().int() });

/** Force a fresh (paid) generation, replacing the stored output. */
const regenerate_word_meanings_route = protectedAdminProcedure
  .input(puzzle_input)
  .output(word_meanings_schema)
  .mutation(({ input: { puzzle_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const data = yield* CACHE.padavali.word_meanings.regenerate(puzzle_id);
        if (!data) {
          return yield* Effect.fail(
            NotFoundError.make({ resource: 'padavali_puzzle', message: 'Puzzle not found' })
          );
        }
        return data;
      })
    )
  );

/** Force a fresh (paid) generation, replacing the stored output. */
const regenerate_more_hints_route = protectedAdminProcedure
  .input(puzzle_input)
  .output(more_hints_schema)
  .mutation(({ input: { puzzle_id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const data = yield* CACHE.padajala.more_hints.regenerate(puzzle_id);
        if (!data) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'padajala_puzzle',
              message: 'Padajala puzzle not found'
            })
          );
        }
        return data;
      })
    )
  );

export const admin_ai_content_router = t.router({
  regenerate_word_meanings: regenerate_word_meanings_route,
  regenerate_more_hints: regenerate_more_hints_route
});

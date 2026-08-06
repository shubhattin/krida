import { z } from 'zod';
import { t, protectedAdminProcedure } from '../trpc_init';
import { puzzle_image_game_enum } from '~/util/types/ai_batch_metadata';
import { runTrpcEffect } from '~/effect/run';
import {
  approve_connect_puzzle_image_id,
  discard_puzzle_image_batch_response,
  get_batch_manager_groups,
  get_puzzle_image_batch_status,
  poll_batch_puzzle_image_gen,
  trigger_batch_puzzle_image_gen
} from '~/util/ai_batch/puzzle_image_ops';

const trigger_puzzle_input_schema = z.object({
  puzzle_id: z.number().int(),
  title: z.string().optional(),
  description: z.string().optional(),
  /** Optional Sanskrit words for richer prompt context (both games). */
  words: z.array(z.string()).optional(),
  /** Optional extra instructions for the image-prompt LLM. */
  extra_instructions: z.string().optional()
});

const trigger_batch_puzzle_image_gen_route = protectedAdminProcedure
  .input(
    z.object({
      game: puzzle_image_game_enum.default('padavali'),
      auto_approved: z.boolean().default(true),
      puzzles: z.array(trigger_puzzle_input_schema).min(1)
    })
  )
  .mutation(({ input }) => runTrpcEffect(trigger_batch_puzzle_image_gen(input)));

/** This route is to poll the results manually, auto-polling will be done by qstash too */
const poll_batch_puzzle_image_gen_route = protectedAdminProcedure
  .input(
    z.object({
      batch_id: z.string()
    })
  )
  .mutation(({ input: { batch_id } }) => runTrpcEffect(poll_batch_puzzle_image_gen(batch_id)));

const approve_puzzle_image_route = protectedAdminProcedure
  .input(
    z.object({
      batch_id: z.string(),
      custom_id: z.string()
    })
  )
  .mutation(({ input: { batch_id, custom_id } }) =>
    runTrpcEffect(approve_connect_puzzle_image_id(batch_id, custom_id))
  );

const get_puzzle_image_batch_status_route = protectedAdminProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      game: puzzle_image_game_enum.default('padavali')
    })
  )
  .query(({ input: { puzzle_id, game } }) =>
    runTrpcEffect(get_puzzle_image_batch_status(puzzle_id, game))
  );

const get_batch_manager_groups_route = protectedAdminProcedure
  .input(z.object({ game: puzzle_image_game_enum.default('padavali') }))
  .query(({ input: { game } }) => runTrpcEffect(get_batch_manager_groups(game)));

const discard_puzzle_image_batch_response_route = protectedAdminProcedure
  .input(
    z.object({
      batch_id: z.string(),
      custom_id: z.string(),
      /** When true, also delete the uploaded `image_assets` row + S3 object. Default false. */
      delete_image_asset: z.boolean().default(false)
    })
  )
  .mutation(({ input: { batch_id, custom_id, delete_image_asset } }) =>
    runTrpcEffect(discard_puzzle_image_batch_response(batch_id, custom_id, delete_image_asset))
  );

export const batch_ai_router = t.router({
  trigger_batch_puzzle_image_gen: trigger_batch_puzzle_image_gen_route,
  poll_batch_puzzle_image_gen: poll_batch_puzzle_image_gen_route,
  approve_puzzle_image: approve_puzzle_image_route,
  get_puzzle_image_batch_status: get_puzzle_image_batch_status_route,
  get_batch_manager_groups: get_batch_manager_groups_route,
  discard_puzzle_image_batch_response: discard_puzzle_image_batch_response_route
});

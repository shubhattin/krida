import { t, protectedAdminProcedure } from '../trpc_init';
import { generateSavePuzzleImage } from '~/util/ai/image_gen';
import {
  generate_puzzle_image_input_schema,
  generate_puzzle_image_output_schema
} from '~/util/ai/image_gen';
import { runTrpcEffect } from '~/effect/run';

const generate_puzzle_card_image_route = protectedAdminProcedure
  .input(generate_puzzle_image_input_schema)
  .output(generate_puzzle_image_output_schema)
  .mutation(({ input }) => runTrpcEffect(generateSavePuzzleImage(input)));

export const ai_image_assets_router = t.router({
  generate_puzzle_card_image: generate_puzzle_card_image_route
});

import { t, protectedAdminProcedure } from '../trpc_init';
import { generatePuzzleImage } from '~/util/ai/image_gen';
import {
  generate_puzzle_image_input_schema,
  generate_puzzle_image_output_schema
} from '~/util/ai/image_gen';
import { db } from '~/db/db';

const generate_puzzle_card_image_route = protectedAdminProcedure
  .input(generate_puzzle_image_input_schema)
  .output(generate_puzzle_image_output_schema)
  .mutation(async ({ input }) => {
    return generatePuzzleImage(input, db);
  });

export const ai_image_assets_router = t.router({
  generate_puzzle_card_image: generate_puzzle_card_image_route
});

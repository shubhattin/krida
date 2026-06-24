import { t, protectedAdminProcedure } from '../trpc_init';
import { generateSavePuzzleImage } from '~/util/ai/image_gen';
import {
  generate_puzzle_image_input_schema,
  generate_puzzle_image_output_schema
} from '~/util/ai/image_gen';
import { db } from '~/db/db';
import { createS3Client } from '~/util/s3/upload_file.server';

const s3Client = createS3Client();

const generate_puzzle_card_image_route = protectedAdminProcedure
  .input(generate_puzzle_image_input_schema)
  .output(generate_puzzle_image_output_schema)
  .mutation(async ({ input }) => {
    return generateSavePuzzleImage(input, s3Client, db);
  });

export const ai_image_assets_router = t.router({
  generate_puzzle_card_image: generate_puzzle_card_image_route
});

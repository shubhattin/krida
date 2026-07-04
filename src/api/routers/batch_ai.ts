import { z } from 'zod';
import { t, protectedAdminProcedure } from '../trpc_init';
import { db } from '~/db/db';
import {
  generateImagePrompt,
  generateFileNameAndDescription,
  generateSavePuzzleImage,
  OPENAI_MODELS,
  IMAGE_CONFIG
} from '~/util/ai/image_gen';
import { TRPCError } from '@trpc/server';
import { createAiBatch, getAiBatchResult, type AiBatchInput } from '~/util/ai_batch';
import { OpenAI } from 'openai';
import { ai_batch_responses } from '~/db/schema';
import { createS3Client } from '~/util/s3/upload_file.server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const s3Client = createS3Client();

const trigger_batch_puzzle_image_gen_route = protectedAdminProcedure
  .input(
    z.object({
      puzzle_ids: z.number().int().array()
    })
  )
  .mutation(async ({ input: { puzzle_ids } }) => {
    const puzzles = await db.query.word_puzzles.findMany({
      columns: {
        id: true,
        title: true,
        description: true
      },
      where: (tbl, { inArray }) => inArray(tbl.id, puzzle_ids)
    });
    if (puzzles.length !== puzzle_ids.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Some puzzles not found'
      });
    }

    const image_prompts = await Promise.all(
      puzzles.map(async (puzzle) => generateImagePrompt(puzzle.title, puzzle.description ?? ''))
    );
    const file_name_descriptions = await Promise.all(
      image_prompts.map(generateFileNameAndDescription)
    );
    const batch_requests: AiBatchInput[] = [];
    for (const [index, puzzle] of puzzles.entries()) {
      batch_requests.push({
        type: 'image',
        custom_id: `puzzle-image-${puzzle.id}`,
        prompt: image_prompts[index],
        model: OPENAI_MODELS.image_generation,
        quality: 'medium',
        size: IMAGE_CONFIG.IMAGE_GEN_DIMS
      });
    }
    const batch_id = await createAiBatch(openai, batch_requests);
    await db.insert(ai_batch_responses).values(
      puzzles.map((puzzle, index) => ({
        batch_id: batch_id,
        custom_id: `puzzle-image-${puzzle.id}`,
        type: 'image' as const,
        auto_approved: false,
        metadata: {
          type: 'image' as const,
          puzzle_id: puzzle.id,
          image_prompt: image_prompts[index],
          file_name: file_name_descriptions[index].file_name,
          image_description: file_name_descriptions[index].description
        }
      }))
    );
    return { batch_id };
  });

export const poll_batch_puzzle_image_gen_func = async (batch_id: string) => {
  const batch = await getAiBatchResult(openai, batch_id);
};
/** This route is to poll the results manually, auto-polling will be done by qstash too */
const poll_batch_puzzle_image_gen_route = protectedAdminProcedure
  .input(
    z.object({
      batch_id: z.string()
    })
  )
  .mutation(async ({ input: { batch_id } }) => {
    return await poll_batch_puzzle_image_gen_func(batch_id);
  });

export const batch_ai_router = t.router({
  trigger_batch_puzzle_image_gen: trigger_batch_puzzle_image_gen_route,
  poll_batch_puzzle_image_gen: poll_batch_puzzle_image_gen_route
});

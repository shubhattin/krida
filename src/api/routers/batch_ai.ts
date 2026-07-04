import { z } from 'zod';
import { t, protectedAdminProcedure } from '../trpc_init';
import { db, type transactionType } from '~/db/db';
import {
  generateImagePrompt,
  generateFileNameAndDescription,
  generateSavePuzzleImage,
  OPENAI_MODELS,
  IMAGE_CONFIG
} from '~/util/ai/image_gen';
import { TRPCError } from '@trpc/server';
import { createAiBatch, getAiBatchResult, type AiBatchInput } from '~/util/ai_batch';
import type { AiBatchPollingStatus } from '~/util/ai_batch/types';
import { OpenAI } from 'openai';
import { ai_batch_responses, word_puzzles } from '~/db/schema';
import { createS3Client } from '~/util/s3/upload_file.server';
import { and, eq } from 'drizzle-orm';
import {
  BATCH_POLLING_INTERVAL_S,
  image_batch_metadata_schema,
  type BatchMetadata
} from '~/util/types/ai_batch_metadata';
import { publishAiBatchResultsQueue } from '~/lib/qstash';

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
    await publishAiBatchResultsQueue({ batch_id }, BATCH_POLLING_INTERVAL_S);
    return { batch_id };
  });

const TERMINAL_FAILURE_STATUSES: ReadonlySet<AiBatchPollingStatus> = new Set([
  'failed',
  'expired',
  'cancelled'
]);

export type PollBatchPuzzleImageGenResult =
  | { status: 'pending'; batch_id: string; openai_status: AiBatchPollingStatus }
  | { status: 'terminal_failure'; batch_id: string; openai_status: AiBatchPollingStatus }
  | { status: 'already_resolved'; batch_id: string; items: PollBatchPuzzleImageGenItem[] }
  | {
      status: 'processed';
      batch_id: string;
      items: PollBatchPuzzleImageGenItem[];
    };

type PollBatchPuzzleImageGenItem = {
  custom_id: string;
  success: boolean;
  uploaded_image_id?: number;
};

function toPollItem(custom_id: string, metadata: BatchMetadata): PollBatchPuzzleImageGenItem {
  return {
    custom_id,
    success: metadata.success === true,
    uploaded_image_id: metadata.uploaded_image_id
  };
}

async function updateBatchRow(
  tx: transactionType,
  batch_id: string,
  custom_id: string,
  metadata: BatchMetadata
) {
  await tx
    .update(ai_batch_responses)
    .set({ metadata, resolved: true })
    .where(
      and(eq(ai_batch_responses.batch_id, batch_id), eq(ai_batch_responses.custom_id, custom_id))
    );
}

export const poll_batch_puzzle_image_gen_func = async (
  batch_id: string
): Promise<PollBatchPuzzleImageGenResult> => {
  return await db.transaction(async (tx) => {
    const db_rows = await tx.query.ai_batch_responses.findMany({
      where: eq(ai_batch_responses.batch_id, batch_id)
    });
    if (db_rows.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No batch responses found for batch_id ${batch_id}`
      });
    }

    if (db_rows.every((row) => row.resolved)) {
      return {
        status: 'already_resolved',
        batch_id,
        items: db_rows.map((row) =>
          toPollItem(row.custom_id, image_batch_metadata_schema.parse(row.metadata))
        )
      };
    }

    const batch = await getAiBatchResult(openai, batch_id, {
      outputs: db_rows.map((row) => ({ type: 'image' as const, custom_id: row.custom_id }))
    });

    if (batch.status !== 'completed') {
      const openai_status = batch.status;

      if (TERMINAL_FAILURE_STATUSES.has(openai_status)) {
        await Promise.all(
          db_rows.map((row) =>
            updateBatchRow(tx, batch_id, row.custom_id, {
              ...image_batch_metadata_schema.parse(row.metadata),
              success: false
            })
          )
        );
        return { status: 'terminal_failure', batch_id, openai_status };
      }

      return { status: 'pending', batch_id, openai_status };
    }

    const output_by_custom_id = new Map(
      [...batch.responses, ...batch.errors].map((output) => [output.custom_id, output])
    );

    const items: PollBatchPuzzleImageGenItem[] = [];

    for (const row of db_rows) {
      const metadata = image_batch_metadata_schema.parse(row.metadata);

      if (row.resolved) {
        items.push(toPollItem(row.custom_id, metadata));
        continue;
      }

      const output = output_by_custom_id.get(row.custom_id);

      if (!output || !output.success || output.type !== 'image' || !output.image_b64) {
        await updateBatchRow(tx, batch_id, row.custom_id, { ...metadata, success: false });
        items.push({ custom_id: row.custom_id, success: false });
        continue;
      }

      const upload_result = await generateSavePuzzleImage(
        { title: '<batch>', existing_image_prompt: metadata.image_prompt },
        s3Client,
        db,
        undefined,
        output.image_b64,
        { file_name: metadata.file_name, description: metadata.image_description }
      );

      if (!upload_result.success) {
        await updateBatchRow(tx, batch_id, row.custom_id, { ...metadata, success: false });
        items.push({ custom_id: row.custom_id, success: false });
        continue;
      }

      await updateBatchRow(tx, batch_id, row.custom_id, {
        ...metadata,
        success: true,
        uploaded_image_id: upload_result.id
      });
      items.push({
        custom_id: row.custom_id,
        success: true,
        uploaded_image_id: upload_result.id
      });
    }

    return { status: 'processed', batch_id, items };
  });
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

/** Extracts upload image asset id and puzzle id from metadata and connects them */
const approve_puzzle_image_func = async (batch_id: string, custom_id: string) => {
  return await db.transaction(async (tx) => {
    const ai_batch_data = await tx.query.ai_batch_responses.findFirst({
      where: and(
        eq(ai_batch_responses.batch_id, batch_id),
        eq(ai_batch_responses.custom_id, custom_id)
      )
    });
    if (!ai_batch_data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No metadata found for batch_id ${batch_id} and custom_id ${custom_id}`
      });
    }
    const { metadata } = ai_batch_data;
    if (metadata.success !== true || metadata.uploaded_image_id === undefined) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Puzzle image not approved for batch_id ${batch_id} and custom_id ${custom_id}`
      });
    }
    const { uploaded_image_id, puzzle_id } = metadata;
    await tx
      .update(word_puzzles)
      .set({
        image_id: uploaded_image_id
      })
      .where(eq(word_puzzles.id, puzzle_id));
    return {
      success: true,
      puzzle_id,
      uploaded_image_id
    };
  });
};

const approve_puzzle_image_route = protectedAdminProcedure
  .input(
    z.object({
      batch_id: z.string(),
      custom_id: z.string()
    })
  )
  .mutation(async ({ input: { batch_id, custom_id } }) => {
    return await approve_puzzle_image_func(batch_id, custom_id);
  });

export const batch_ai_router = t.router({
  trigger_batch_puzzle_image_gen: trigger_batch_puzzle_image_gen_route,
  poll_batch_puzzle_image_gen: poll_batch_puzzle_image_gen_route,
  approve_puzzle_image: approve_puzzle_image_route
});

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
import {
  ai_batches,
  ai_batch_responses,
  image_assets,
  padavali_puzzles,
  crossword_puzzles
} from '~/db/schema';
import { createS3Client, deleteAssetFile } from '~/util/s3/upload_file.server';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  BATCH_POLLING_INTERVAL_S,
  batch_metadata_schema,
  puzzle_image_game_enum,
  type BatchMetadata,
  type PuzzleImageGame
} from '~/util/types/ai_batch_metadata';
import { publishAiBatchResultsQueue } from '~/lib/qstash';
import {
  getPuzzleImageBatchCustomId,
  parsePuzzleIdFromBatchCustomId
} from '~/util/ai_batch/puzzle_image';
import { derivePuzzleImageBatchUiStatus } from '~/util/ai_batch/batch_image_status';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import ms from 'ms';
import { waitUntil } from '@vercel/functions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const s3Client = createS3Client();

const trigger_puzzle_input_schema = z.object({
  puzzle_id: z.number().int(),
  title: z.string().optional(),
  description: z.string().optional(),
  /** Optional Sanskrit words for richer prompt context (both games). */
  words: z.array(z.string()).optional(),
  /** Optional extra instructions for the image-prompt LLM. */
  extra_instructions: z.string().optional()
});

function parseBatchMetadata(metadata: unknown): BatchMetadata {
  return batch_metadata_schema.parse(metadata);
}

function resolveBatchGame(metadata: BatchMetadata, custom_id: string): PuzzleImageGame {
  return metadata.game ?? parsePuzzleIdFromBatchCustomId(custom_id)?.game ?? 'padavali';
}

function buildImageBatchMetadata(args: {
  game: PuzzleImageGame;
  puzzle_id: number;
  image_prompt: string;
  file_name: string;
  image_description: string;
}): BatchMetadata {
  if (args.game === 'crossword') {
    return {
      type: 'crossword-puzzle-image',
      game: 'crossword',
      puzzle_id: args.puzzle_id,
      image_prompt: args.image_prompt,
      file_name: args.file_name,
      image_description: args.image_description
    };
  }
  return {
    type: 'puzzle-image',
    game: 'padavali',
    puzzle_id: args.puzzle_id,
    image_prompt: args.image_prompt,
    file_name: args.file_name,
    image_description: args.image_description
  };
}

/** How long a poll "claim" on an unresolved batch row stays exclusive.
 *  Concurrent pollers (QStash + manual) skip rows claimed within this window.
 *  After it expires, another worker may reclaim the row if the first crashed mid-upload. */
const POLL_CLAIM_STALE_MS = ms('12mins');

async function deleteImageAssetById(image_id: number) {
  const asset = await db.query.image_assets.findFirst({
    columns: { id: true, s3_key: true },
    where: eq(image_assets.id, image_id)
  });
  if (!asset) {
    return { deleted: false as const };
  }

  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await deleteAssetFile(asset.s3_key, { s3Client });
      break;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      } else {
        throw new Error(`Failed to delete asset file from storage: ${String(lastError)}`);
      }
    }
  }

  const [deleted] = await db.delete(image_assets).where(eq(image_assets.id, image_id)).returning();
  return { deleted: deleted !== undefined };
}

/** Delete OpenAI Files API objects (batch input/output). Ignores already-deleted files. */
async function deleteOpenAiFiles(file_ids: (string | null | undefined)[]) {
  const unique_ids = [...new Set(file_ids.filter((id): id is string => !!id))];
  await Promise.all(
    unique_ids.map((file_id) =>
      openai.files.delete(file_id).catch((err) => {
        console.error(`Failed to delete OpenAI file ${file_id}:`, err);
      })
    )
  );
}

/**
 * File ids live on ai_batches (shared across custom_ids).
 * After the last response row is gone, delete the batch row and OpenAI files.
 */
function scheduleOpenAiBatchCleanup(batch_id: string) {
  const cleanup = (async () => {
    const remaining = await db.query.ai_batch_responses.findFirst({
      columns: { batch_id: true },
      where: eq(ai_batch_responses.batch_id, batch_id)
    });
    if (remaining) return;

    const batch = await db.query.ai_batches.findFirst({
      columns: { input_file_id: true, output_file_id: true },
      where: eq(ai_batches.batch_id, batch_id)
    });
    if (!batch) return;

    await db.delete(ai_batches).where(eq(ai_batches.batch_id, batch_id));
    await deleteOpenAiFiles([batch.input_file_id, batch.output_file_id]);
  })().catch((err) => {
    console.error(`Failed OpenAI batch file cleanup for batch ${batch_id}:`, err);
  });

  waitUntil(cleanup);
}

/** Item not yet finalized — same role as the old `output_resolved = false` row filter. */
const responseItemUnprocessed = sql`${ai_batch_responses.metadata}->>'success' IS NULL`;

async function tryClaimBatchRow(batch_id: string, custom_id: string) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(ai_batch_responses)
      .where(
        and(
          eq(ai_batch_responses.batch_id, batch_id),
          eq(ai_batch_responses.custom_id, custom_id),
          responseItemUnprocessed
        )
      )
      .for('update')
      .limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    const metadata = parseBatchMetadata(row.metadata);
    if (metadata.poll_claimed_at) {
      const claimed_at = Date.parse(metadata.poll_claimed_at);
      if (!Number.isNaN(claimed_at) && Date.now() - claimed_at < POLL_CLAIM_STALE_MS) {
        return null;
      }
    }

    const claimed_metadata = { ...metadata, poll_claimed_at: new Date().toISOString() };
    const updated = await tx
      .update(ai_batch_responses)
      .set({ metadata: claimed_metadata })
      .where(
        and(
          eq(ai_batch_responses.batch_id, batch_id),
          eq(ai_batch_responses.custom_id, custom_id),
          responseItemUnprocessed
        )
      )
      .returning();

    if (updated.length === 0) {
      return null;
    }

    return { ...row, metadata: claimed_metadata };
  });
}

const trigger_batch_puzzle_image_gen_route = protectedAdminProcedure
  .input(
    z.object({
      game: puzzle_image_game_enum.default('padavali'),
      auto_approved: z.boolean().default(true),
      puzzles: z.array(trigger_puzzle_input_schema).min(1)
    })
  )
  .mutation(async ({ input: { game, auto_approved, puzzles: puzzle_inputs } }) => {
    const puzzle_ids = puzzle_inputs.map((puzzle) => puzzle.puzzle_id);
    const db_puzzles =
      game === 'crossword'
        ? await db.query.crossword_puzzles.findMany({
            columns: {
              id: true,
              title: true,
              description: true
            },
            where: (tbl, { inArray }) => inArray(tbl.id, puzzle_ids)
          })
        : await db.query.padavali_puzzles.findMany({
            columns: {
              id: true,
              title: true,
              description: true
            },
            where: (tbl, { inArray }) => inArray(tbl.id, puzzle_ids)
          });
    if (db_puzzles.length !== puzzle_ids.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Some puzzles not found'
      });
    }

    const puzzle_by_id = new Map(db_puzzles.map((puzzle) => [puzzle.id, puzzle]));
    const resolved_puzzles = puzzle_inputs.map((input) => {
      const db_puzzle = puzzle_by_id.get(input.puzzle_id)!;
      return {
        id: input.puzzle_id,
        title: input.title ?? db_puzzle.title,
        description: input.description ?? db_puzzle.description ?? '',
        words: input.words,
        extra_instructions: input.extra_instructions
      };
    });

    // Prompt from title + description; optionally include words / extra instructions when supplied.
    const image_prompts = await Promise.all(
      resolved_puzzles.map(async (puzzle) =>
        generateImagePrompt(
          puzzle.title,
          puzzle.description,
          puzzle.words,
          puzzle.extra_instructions
        )
      )
    );
    const file_name_descriptions = await Promise.all(
      image_prompts.map(generateFileNameAndDescription)
    );
    const batch_requests: AiBatchInput[] = [];
    for (const [index, puzzle] of resolved_puzzles.entries()) {
      batch_requests.push({
        type: 'image',
        custom_id: getPuzzleImageBatchCustomId(puzzle.id, game),
        prompt: image_prompts[index],
        model: OPENAI_MODELS.image_generation,
        quality: 'medium',
        size: IMAGE_CONFIG.IMAGE_GEN_DIMS
      });
    }
    const { batch_id, input_file_id } = await createAiBatch(openai, batch_requests);
    try {
      await db.transaction(async (tx) => {
        await tx.insert(ai_batches).values({
          batch_id,
          type: 'image',
          input_file_id
        });
        await tx.insert(ai_batch_responses).values(
          resolved_puzzles.map((puzzle, index) => ({
            batch_id,
            custom_id: getPuzzleImageBatchCustomId(puzzle.id, game),
            auto_approved,
            metadata: buildImageBatchMetadata({
              game,
              puzzle_id: puzzle.id,
              image_prompt: image_prompts[index],
              file_name: file_name_descriptions[index].file_name,
              image_description: file_name_descriptions[index].description
            })
          }))
        );
      });
      await publishAiBatchResultsQueue({ batch_id, poll_attempt: 0 }, BATCH_POLLING_INTERVAL_S);
    } catch (err) {
      await openai.batches.cancel(batch_id).catch((cancel_err) => {
        console.error(`Failed to cancel orphaned OpenAI batch ${batch_id}:`, cancel_err);
      });
      throw err;
    }
    return { batch_id, puzzle_count: resolved_puzzles.length, game };
  });

const TERMINAL_FAILURE_STATUSES: ReadonlySet<AiBatchPollingStatus> = new Set([
  'failed',
  'expired',
  'cancelled'
]);

type PollBatchPuzzleImageGenCoreResult =
  | { status: 'pending'; batch_id: string; openai_status: AiBatchPollingStatus }
  | { status: 'terminal_failure'; batch_id: string; openai_status: AiBatchPollingStatus }
  | { status: 'already_resolved'; batch_id: string; items: PollBatchPuzzleImageGenItem[] }
  | { status: 'processed'; batch_id: string; items: PollBatchPuzzleImageGenItem[] };

export type PollBatchPuzzleImageGenResult = PollBatchPuzzleImageGenCoreResult & { message: string };

type PollBatchPuzzleImageGenItem = {
  custom_id: string;
  success: boolean;
  uploaded_image_id?: number;
  message?: string;
};

function toPollItem(custom_id: string, metadata: BatchMetadata): PollBatchPuzzleImageGenItem {
  return {
    custom_id,
    success: metadata.success === true,
    uploaded_image_id: metadata.uploaded_image_id
  };
}

function isResponseItemProcessed(metadata: BatchMetadata): boolean {
  return metadata.success !== undefined;
}

/**
 * Finalize a response row only if it is still unprocessed (`metadata.success` unset).
 * Returns false if another worker already wrote success/failure (CAS vs old output_resolved=false).
 */
async function updateBatchResponse(
  tx: transactionType,
  batch_id: string,
  custom_id: string,
  metadata: BatchMetadata,
  output_file_id?: string | null
): Promise<boolean> {
  const updated = await tx
    .update(ai_batch_responses)
    .set({ metadata })
    .where(
      and(
        eq(ai_batch_responses.batch_id, batch_id),
        eq(ai_batch_responses.custom_id, custom_id),
        responseItemUnprocessed
      )
    )
    .returning();

  if (updated.length === 0) {
    return false;
  }

  if (output_file_id != null) {
    await tx.update(ai_batches).set({ output_file_id }).where(eq(ai_batches.batch_id, batch_id));
  }

  return true;
}

/** Mark batch output resolved once every custom_id has success set in metadata. */
async function markBatchOutputResolvedIfComplete(
  tx: transactionType,
  batch_id: string,
  output_file_id?: string | null
) {
  const responses = await tx.query.ai_batch_responses.findMany({
    where: eq(ai_batch_responses.batch_id, batch_id),
    columns: { metadata: true }
  });
  const all_processed = responses.every((row) =>
    isResponseItemProcessed(parseBatchMetadata(row.metadata))
  );
  if (!all_processed) return;

  await tx
    .update(ai_batches)
    .set({
      output_resolved: true,
      ...(output_file_id != null ? { output_file_id } : {})
    })
    .where(and(eq(ai_batches.batch_id, batch_id), eq(ai_batches.output_resolved, false)));
}

/** Connects uploaded image to puzzle and removes the batch response row. */
export const approve_connect_puzzle_image_id_func = async (batch_id: string, custom_id: string) => {
  const result = await db.transaction(async (tx) => {
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
    const metadata = parseBatchMetadata(ai_batch_data.metadata);
    if (metadata.success !== true || metadata.uploaded_image_id === undefined) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Puzzle image not ready for batch_id ${batch_id} and custom_id ${custom_id}`
      });
    }
    const { uploaded_image_id, puzzle_id } = metadata;
    const game = resolveBatchGame(metadata, custom_id);

    if (game === 'crossword') {
      const puzzle = await tx.query.crossword_puzzles.findFirst({
        columns: { slug: true, listed: true },
        where: eq(crossword_puzzles.id, puzzle_id)
      });
      if (!puzzle) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Puzzle not found for batch_id ${batch_id} and custom_id ${custom_id}`
        });
      }

      await Promise.all([
        tx
          .update(crossword_puzzles)
          .set({
            image_id: uploaded_image_id
          })
          .where(eq(crossword_puzzles.id, puzzle_id)),
        tx
          .delete(ai_batch_responses)
          .where(
            and(
              eq(ai_batch_responses.batch_id, batch_id),
              eq(ai_batch_responses.custom_id, custom_id)
            )
          )
      ]);

      return {
        success: true as const,
        puzzle_id,
        uploaded_image_id,
        game,
        slug: puzzle.slug,
        listed: puzzle.listed
      };
    }

    const puzzle = await tx.query.padavali_puzzles.findFirst({
      columns: { slug: true, listed: true },
      where: eq(padavali_puzzles.id, puzzle_id)
    });
    if (!puzzle) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Puzzle not found for batch_id ${batch_id} and custom_id ${custom_id}`
      });
    }

    await Promise.all([
      tx
        .update(padavali_puzzles)
        .set({
          image_id: uploaded_image_id
        })
        .where(eq(padavali_puzzles.id, puzzle_id)),
      tx
        .delete(ai_batch_responses)
        .where(
          and(
            eq(ai_batch_responses.batch_id, batch_id),
            eq(ai_batch_responses.custom_id, custom_id)
          )
        )
    ]);

    return {
      success: true as const,
      puzzle_id,
      uploaded_image_id,
      game,
      slug: puzzle.slug,
      listed: puzzle.listed
    };
  });

  if (result.game === 'crossword') {
    const current_schedule = await CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS);
    await Promise.all([
      current_schedule &&
        current_schedule.puzzle.id === result.puzzle_id &&
        invalidate_and_refresh_cache(CACHE.crossword.current_schedule, NO_CACHE_PARAMS),
      invalidate_and_refresh_cache(CACHE.crossword.word_puzzle, { slug: result.slug }),
      result.listed &&
        invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS)
    ]);
  } else {
    const current_schedule = await CACHE.padavali.current_schedule.get(NO_CACHE_PARAMS);
    await Promise.all([
      current_schedule &&
        current_schedule.puzzle.id === result.puzzle_id &&
        invalidate_and_refresh_cache(CACHE.padavali.current_schedule, NO_CACHE_PARAMS),
      invalidate_and_refresh_cache(CACHE.padavali.word_puzzle, { slug: result.slug }),
      result.listed &&
        invalidate_and_refresh_cache(CACHE.padavali.listed_puzzle_list, NO_CACHE_PARAMS)
    ]);
  }

  scheduleOpenAiBatchCleanup(batch_id);

  return {
    success: result.success,
    puzzle_id: result.puzzle_id,
    uploaded_image_id: result.uploaded_image_id,
    game: result.game
  };
};

async function autoApproveEligibleRows(
  batch_id: string,
  items: PollBatchPuzzleImageGenItem[]
): Promise<PollBatchPuzzleImageGenItem[]> {
  const rows = await db.query.ai_batch_responses.findMany({
    where: eq(ai_batch_responses.batch_id, batch_id),
    columns: { custom_id: true, auto_approved: true }
  });
  const auto_approved_custom_ids = new Set(
    rows.filter((row) => row.auto_approved).map((row) => row.custom_id)
  );

  return Promise.all(
    items.map(async (item) => {
      if (!item.success || !auto_approved_custom_ids.has(item.custom_id)) {
        return item;
      }

      try {
        const result = await approve_connect_puzzle_image_id_func(batch_id, item.custom_id);
        return {
          ...item,
          message: `Auto-connected image ${result.uploaded_image_id} to puzzle ${result.puzzle_id}`
        };
      } catch (err) {
        const message =
          err instanceof TRPCError ? err.message : 'Auto-approve failed to connect puzzle image';
        return { ...item, message };
      }
    })
  );
}

function buildProcessedMessage(items: PollBatchPuzzleImageGenItem[]) {
  const succeeded = items.filter((item) => item.success).length;
  const auto_connected = items.filter((item) => item.message?.startsWith('Auto-connected')).length;
  const failed = items.length - succeeded;

  const parts = [`${succeeded}/${items.length} batch item(s) succeeded`];
  if (failed > 0) {
    parts.push(`${failed} failed`);
  }
  if (auto_connected > 0) {
    parts.push(`${auto_connected} auto-connected to puzzle(s)`);
  }

  return parts.join('; ') + '.';
}

export const poll_batch_puzzle_image_gen_func = async (
  batch_id: string
): Promise<PollBatchPuzzleImageGenResult> => {
  const ai_batch = await db.query.ai_batches.findFirst({
    where: eq(ai_batches.batch_id, batch_id),
    with: { responses: true }
  });
  if (!ai_batch || ai_batch.responses.length === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No batch responses found for batch_id ${batch_id}`
    });
  }

  const db_rows = ai_batch.responses;

  if (ai_batch.output_resolved) {
    const items = await autoApproveEligibleRows(
      batch_id,
      db_rows.map((row) => toPollItem(row.custom_id, parseBatchMetadata(row.metadata)))
    );
    return {
      status: 'already_resolved',
      batch_id,
      items,
      message: buildProcessedMessage(items)
    };
  }

  const batch = await getAiBatchResult(openai, batch_id, {
    outputs: db_rows.map((row) => ({ type: 'image' as const, custom_id: row.custom_id }))
  });
  const batch_output_file_id = batch.output_file_id ?? null;

  if (batch.status !== 'completed') {
    const openai_status = batch.status;

    if (TERMINAL_FAILURE_STATUSES.has(openai_status)) {
      await db.transaction(async (tx) => {
        const unprocessed_rows = db_rows.filter(
          (row) => !isResponseItemProcessed(parseBatchMetadata(row.metadata))
        );
        if (unprocessed_rows.length > 0) {
          const value_rows = unprocessed_rows.map((row) => {
            const metadata = {
              ...parseBatchMetadata(row.metadata),
              success: false as const
            };
            return sql`(${row.custom_id}::text, ${JSON.stringify(metadata)}::jsonb)`;
          });
          await tx.execute(sql`
            UPDATE ${ai_batch_responses} AS t
            SET metadata = v.metadata
            FROM (VALUES ${sql.join(value_rows, sql`, `)}) AS v(custom_id, metadata)
            WHERE t.batch_id = ${batch_id}
              AND t.custom_id = v.custom_id
              AND t.metadata->>'success' IS NULL
          `);
          if (batch_output_file_id != null) {
            await tx
              .update(ai_batches)
              .set({ output_file_id: batch_output_file_id })
              .where(eq(ai_batches.batch_id, batch_id));
          }
        }
        await markBatchOutputResolvedIfComplete(tx, batch_id, batch_output_file_id);
      });
      return {
        status: 'terminal_failure',
        batch_id,
        openai_status,
        message: `Batch ended with status ${openai_status}; outputs marked as failed.`
      };
    }

    return {
      status: 'pending',
      batch_id,
      openai_status,
      message: `Batch is still ${openai_status}; try again later.`
    };
  }

  const output_by_custom_id = new Map(
    [...batch.responses, ...batch.errors].map((output) => [output.custom_id, output])
  );

  const items: PollBatchPuzzleImageGenItem[] = [];

  for (const row of db_rows) {
    const row_metadata = parseBatchMetadata(row.metadata);
    if (isResponseItemProcessed(row_metadata)) {
      items.push(toPollItem(row.custom_id, row_metadata));
      continue;
    }

    const claimed_row = await tryClaimBatchRow(batch_id, row.custom_id);
    if (!claimed_row) {
      const resolved_row = await db.query.ai_batch_responses.findFirst({
        where: and(
          eq(ai_batch_responses.batch_id, batch_id),
          eq(ai_batch_responses.custom_id, row.custom_id)
        )
      });
      if (resolved_row) {
        const resolved_metadata = parseBatchMetadata(resolved_row.metadata);
        if (isResponseItemProcessed(resolved_metadata)) {
          items.push(toPollItem(resolved_row.custom_id, resolved_metadata));
        }
      }
      continue;
    }

    const metadata = parseBatchMetadata(claimed_row.metadata);

    const output = output_by_custom_id.get(row.custom_id);

    if (!output || !output.success || output.type !== 'image' || !output.image_b64) {
      const wrote = await db.transaction(async (tx) => {
        const ok = await updateBatchResponse(tx, batch_id, row.custom_id, {
          ...metadata,
          success: false
        });
        await markBatchOutputResolvedIfComplete(tx, batch_id, batch_output_file_id);
        return ok;
      });
      if (wrote) {
        items.push({ custom_id: row.custom_id, success: false });
      } else {
        const resolved_row = await db.query.ai_batch_responses.findFirst({
          where: and(
            eq(ai_batch_responses.batch_id, batch_id),
            eq(ai_batch_responses.custom_id, row.custom_id)
          )
        });
        if (resolved_row) {
          items.push(toPollItem(resolved_row.custom_id, parseBatchMetadata(resolved_row.metadata)));
        }
      }
      continue;
    }

    const upload_result = await generateSavePuzzleImage(
      { title: '<batch>', existing_image_prompt: metadata.image_prompt, game: metadata.game },
      s3Client,
      db,
      undefined,
      output.image_b64,
      { file_name: metadata.file_name, description: metadata.image_description }
    );

    if (!upload_result.success) {
      const wrote = await db.transaction(async (tx) => {
        const ok = await updateBatchResponse(tx, batch_id, row.custom_id, {
          ...metadata,
          success: false
        });
        await markBatchOutputResolvedIfComplete(tx, batch_id, batch_output_file_id);
        return ok;
      });
      if (wrote) {
        items.push({ custom_id: row.custom_id, success: false });
      } else {
        const resolved_row = await db.query.ai_batch_responses.findFirst({
          where: and(
            eq(ai_batch_responses.batch_id, batch_id),
            eq(ai_batch_responses.custom_id, row.custom_id)
          )
        });
        if (resolved_row) {
          items.push(toPollItem(resolved_row.custom_id, parseBatchMetadata(resolved_row.metadata)));
        }
      }
      continue;
    }

    const persisted = await db.transaction(async (tx) => {
      const wrote = await updateBatchResponse(
        tx,
        batch_id,
        row.custom_id,
        {
          ...metadata,
          success: true,
          uploaded_image_id: upload_result.id
        },
        batch_output_file_id
      );
      if (!wrote) {
        return false;
      }
      await markBatchOutputResolvedIfComplete(tx, batch_id, batch_output_file_id);
      return true;
    });

    if (!persisted) {
      await deleteImageAssetById(upload_result.id).catch((err) => {
        console.error(`Failed to clean up duplicate batch upload image ${upload_result.id}:`, err);
      });
      const resolved_row = await db.query.ai_batch_responses.findFirst({
        where: and(
          eq(ai_batch_responses.batch_id, batch_id),
          eq(ai_batch_responses.custom_id, row.custom_id)
        )
      });
      if (resolved_row) {
        const resolved_metadata = parseBatchMetadata(resolved_row.metadata);
        if (isResponseItemProcessed(resolved_metadata)) {
          items.push(toPollItem(resolved_row.custom_id, resolved_metadata));
        }
      }
      continue;
    }

    items.push({
      custom_id: row.custom_id,
      success: true,
      uploaded_image_id: upload_result.id
    });
  }

  const resolved_items = await autoApproveEligibleRows(batch_id, items);
  return {
    status: 'processed',
    batch_id,
    items: resolved_items,
    message: buildProcessedMessage(resolved_items)
  };
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

const approve_puzzle_image_route = protectedAdminProcedure
  .input(
    z.object({
      batch_id: z.string(),
      custom_id: z.string()
    })
  )
  .mutation(async ({ input: { batch_id, custom_id } }) => {
    return await approve_connect_puzzle_image_id_func(batch_id, custom_id);
  });

async function enrichBatchRowWithAssetAndPuzzle(row: {
  batch_id: string;
  custom_id: string;
  output_resolved: boolean;
  auto_approved: boolean;
  metadata: BatchMetadata;
}) {
  const metadata = parseBatchMetadata(row.metadata);
  const parsed_custom = parsePuzzleIdFromBatchCustomId(row.custom_id);
  const puzzle_id = metadata.puzzle_id ?? parsed_custom?.puzzle_id ?? null;
  const game = resolveBatchGame(metadata, row.custom_id);
  let puzzle_title: string | null = null;
  if (puzzle_id !== null) {
    if (game === 'crossword') {
      const puzzle = await db.query.crossword_puzzles.findFirst({
        columns: { title: true },
        where: eq(crossword_puzzles.id, puzzle_id)
      });
      puzzle_title = puzzle?.title ?? null;
    } else {
      const puzzle = await db.query.padavali_puzzles.findFirst({
        columns: { title: true },
        where: eq(padavali_puzzles.id, puzzle_id)
      });
      puzzle_title = puzzle?.title ?? null;
    }
  }

  let image_asset: {
    id: number;
    s3_key: string;
    width: number;
    height: number;
    description: string | null;
  } | null = null;

  if (metadata.uploaded_image_id !== undefined) {
    const asset = await db.query.image_assets.findFirst({
      columns: {
        id: true,
        s3_key: true,
        width: true,
        height: true,
        description: true
      },
      where: eq(image_assets.id, metadata.uploaded_image_id)
    });
    if (asset) {
      image_asset = asset;
    }
  }

  return {
    batch_id: row.batch_id,
    custom_id: row.custom_id,
    output_resolved: row.output_resolved,
    auto_approved: row.auto_approved,
    metadata,
    game,
    puzzle_id,
    puzzle_title,
    image_asset,
    status: derivePuzzleImageBatchUiStatus(row.output_resolved, metadata, row.auto_approved)
  };
}

const get_puzzle_image_batch_status_route = protectedAdminProcedure
  .input(
    z.object({
      puzzle_id: z.number().int(),
      game: puzzle_image_game_enum.default('padavali')
    })
  )
  .query(async ({ input: { puzzle_id, game } }) => {
    const custom_id = getPuzzleImageBatchCustomId(puzzle_id, game);
    const rows = await db
      .select({
        batch_id: ai_batch_responses.batch_id,
        custom_id: ai_batch_responses.custom_id,
        output_resolved: ai_batches.output_resolved,
        auto_approved: ai_batch_responses.auto_approved,
        metadata: ai_batch_responses.metadata
      })
      .from(ai_batch_responses)
      .innerJoin(ai_batches, eq(ai_batch_responses.batch_id, ai_batches.batch_id))
      .where(and(eq(ai_batch_responses.custom_id, custom_id), eq(ai_batches.type, 'image')));
    if (rows.length === 0) {
      return null;
    }

    const active_row =
      rows.find((row) => !row.output_resolved) ??
      rows.find(
        (row) =>
          row.output_resolved &&
          row.metadata.success === true &&
          row.metadata.uploaded_image_id !== undefined &&
          row.auto_approved
      ) ??
      rows.find(
        (row) =>
          row.output_resolved &&
          row.metadata.success === true &&
          row.metadata.uploaded_image_id !== undefined &&
          !row.auto_approved
      ) ??
      rows[rows.length - 1];

    return await enrichBatchRowWithAssetAndPuzzle(active_row);
  });

const get_batch_manager_groups_route = protectedAdminProcedure
  .input(z.object({ game: puzzle_image_game_enum.default('padavali') }))
  .query(async ({ input: { game } }) => {
    const batches = await db.query.ai_batches.findMany({
      where: eq(ai_batches.type, 'image'),
      orderBy: [desc(ai_batches.batch_id)],
      with: { responses: true }
    });

    const rows = batches.flatMap((batch) =>
      batch.responses
        .map((response) => ({
          batch_id: batch.batch_id,
          custom_id: response.custom_id,
          output_resolved: batch.output_resolved,
          auto_approved: response.auto_approved,
          metadata: parseBatchMetadata(response.metadata)
        }))
        .filter((row) => resolveBatchGame(row.metadata, row.custom_id) === game)
    );

    const puzzle_ids = new Set<number>();
    const image_ids = new Set<number>();
    for (const row of rows) {
      if (row.metadata.puzzle_id !== undefined) {
        puzzle_ids.add(row.metadata.puzzle_id);
      } else {
        const parsed = parsePuzzleIdFromBatchCustomId(row.custom_id);
        if (parsed !== null) puzzle_ids.add(parsed.puzzle_id);
      }
      if (row.metadata.uploaded_image_id !== undefined) {
        image_ids.add(row.metadata.uploaded_image_id);
      }
    }

    const puzzle_id_list = [...puzzle_ids];
    const [puzzles, assets] = await Promise.all([
      puzzle_id_list.length > 0
        ? game === 'crossword'
          ? db.query.crossword_puzzles.findMany({
              columns: { id: true, title: true },
              where: inArray(crossword_puzzles.id, puzzle_id_list)
            })
          : db.query.padavali_puzzles.findMany({
              columns: { id: true, title: true },
              where: inArray(padavali_puzzles.id, puzzle_id_list)
            })
        : Promise.resolve([]),
      image_ids.size > 0
        ? db.query.image_assets.findMany({
            columns: {
              id: true,
              s3_key: true,
              width: true,
              height: true,
              description: true
            },
            where: inArray(image_assets.id, [...image_ids])
          })
        : Promise.resolve([])
    ]);

    const puzzle_by_id = new Map(puzzles.map((puzzle) => [puzzle.id, puzzle]));
    const asset_by_id = new Map(assets.map((asset) => [asset.id, asset]));

    const groups = new Map<
      string,
      {
        batch_id: string;
        items: Awaited<ReturnType<typeof enrichBatchRowWithAssetAndPuzzle>>[];
      }
    >();

    for (const row of rows) {
      const metadata = row.metadata;
      const puzzle_id =
        metadata.puzzle_id ?? parsePuzzleIdFromBatchCustomId(row.custom_id)?.puzzle_id ?? null;
      const puzzle_title = puzzle_id !== null ? (puzzle_by_id.get(puzzle_id)?.title ?? null) : null;
      const image_asset =
        metadata.uploaded_image_id !== undefined
          ? (asset_by_id.get(metadata.uploaded_image_id) ?? null)
          : null;

      const item = {
        batch_id: row.batch_id,
        custom_id: row.custom_id,
        output_resolved: row.output_resolved,
        auto_approved: row.auto_approved,
        metadata,
        game,
        puzzle_id,
        puzzle_title,
        image_asset,
        status: derivePuzzleImageBatchUiStatus(row.output_resolved, metadata, row.auto_approved)
      };

      const existing = groups.get(row.batch_id);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(row.batch_id, { batch_id: row.batch_id, items: [item] });
      }
    }

    return [...groups.values()].map((group) => {
      const counts = {
        pending: 0,
        ready: 0,
        failed: 0,
        auto_approved: 0
      };
      for (const item of group.items) {
        if (item.status === 'processing') counts.pending++;
        else if (item.status === 'ready_for_review' || item.status === 'auto_applying')
          counts.ready++;
        else if (item.status === 'failed') counts.failed++;
        if (item.auto_approved) counts.auto_approved++;
      }
      return { ...group, counts };
    });
  });

const discard_puzzle_image_batch_response_route = protectedAdminProcedure
  .input(
    z.object({
      batch_id: z.string(),
      custom_id: z.string()
    })
  )
  .mutation(async ({ input: { batch_id, custom_id } }) => {
    const row = await db.query.ai_batch_responses.findFirst({
      where: and(
        eq(ai_batch_responses.batch_id, batch_id),
        eq(ai_batch_responses.custom_id, custom_id)
      )
    });
    if (!row) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No batch response found for batch_id ${batch_id} and custom_id ${custom_id}`
      });
    }

    const metadata = parseBatchMetadata(row.metadata);
    let deleted_image_id: number | null = null;
    if (metadata.uploaded_image_id !== undefined) {
      await deleteImageAssetById(metadata.uploaded_image_id);
      deleted_image_id = metadata.uploaded_image_id;
    }

    await db
      .delete(ai_batch_responses)
      .where(
        and(eq(ai_batch_responses.batch_id, batch_id), eq(ai_batch_responses.custom_id, custom_id))
      );

    scheduleOpenAiBatchCleanup(batch_id);

    return {
      success: true,
      deleted_image_id,
      puzzle_id: metadata.puzzle_id ?? parsePuzzleIdFromBatchCustomId(custom_id)?.puzzle_id ?? null
    };
  });

export const batch_ai_router = t.router({
  trigger_batch_puzzle_image_gen: trigger_batch_puzzle_image_gen_route,
  poll_batch_puzzle_image_gen: poll_batch_puzzle_image_gen_route,
  approve_puzzle_image: approve_puzzle_image_route,
  get_puzzle_image_batch_status: get_puzzle_image_batch_status_route,
  get_batch_manager_groups: get_batch_manager_groups_route,
  discard_puzzle_image_batch_response: discard_puzzle_image_batch_response_route
});

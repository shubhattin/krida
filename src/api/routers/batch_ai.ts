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
import { ai_batch_responses, image_assets, word_puzzles } from '~/db/schema';
import { createS3Client, deleteAssetFile } from '~/util/s3/upload_file.server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  BATCH_POLLING_INTERVAL_S,
  image_batch_metadata_schema,
  type BatchMetadata
} from '~/util/types/ai_batch_metadata';
import { publishAiBatchResultsQueue } from '~/lib/qstash';
import {
  getPuzzleImageBatchCustomId,
  parsePuzzleIdFromBatchCustomId
} from '~/util/ai_batch/puzzle_image';
import { derivePuzzleImageBatchUiStatus } from '~/util/ai_batch/batch_image_status';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const s3Client = createS3Client();

const trigger_puzzle_input_schema = z.object({
  puzzle_id: z.number().int(),
  title: z.string().optional(),
  description: z.string().optional(),
  words: z.array(z.string()).optional()
});

async function deleteImageAssetById(image_id: number) {
  const [deleted] = await db.delete(image_assets).where(eq(image_assets.id, image_id)).returning();
  if (!deleted) {
    return { deleted: false as const };
  }

  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await deleteAssetFile(deleted.s3_key, { s3Client });
      return { deleted: true as const };
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }
  }

  throw new Error(`Failed to delete asset file from storage: ${String(lastError)}`);
}

const trigger_batch_puzzle_image_gen_route = protectedAdminProcedure
  .input(
    z.object({
      auto_approved: z.boolean().default(true),
      puzzles: z.array(trigger_puzzle_input_schema).min(1)
    })
  )
  .mutation(async ({ input: { auto_approved, puzzles: puzzle_inputs } }) => {
    const puzzle_ids = puzzle_inputs.map((puzzle) => puzzle.puzzle_id);
    const db_puzzles = await db.query.word_puzzles.findMany({
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
        description: input.description ?? db_puzzle.description ?? ''
      };
    });

    const image_prompts = await Promise.all(
      resolved_puzzles.map(async (puzzle) => generateImagePrompt(puzzle.title, puzzle.description))
    );
    const file_name_descriptions = await Promise.all(
      image_prompts.map(generateFileNameAndDescription)
    );
    const batch_requests: AiBatchInput[] = [];
    for (const [index, puzzle] of resolved_puzzles.entries()) {
      batch_requests.push({
        type: 'image',
        custom_id: getPuzzleImageBatchCustomId(puzzle.id),
        prompt: image_prompts[index],
        model: OPENAI_MODELS.image_generation,
        quality: 'medium',
        size: IMAGE_CONFIG.IMAGE_GEN_DIMS
      });
    }
    const { batch_id, input_file_id } = await createAiBatch(openai, batch_requests);
    await db.insert(ai_batch_responses).values(
      resolved_puzzles.map((puzzle, index) => ({
        batch_id: batch_id,
        custom_id: getPuzzleImageBatchCustomId(puzzle.id),
        type: 'image' as const,
        auto_approved,
        input_file_id,
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
    return { batch_id, puzzle_count: resolved_puzzles.length };
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

async function updateBatchRow(
  tx: transactionType,
  batch_id: string,
  custom_id: string,
  metadata: BatchMetadata,
  output_file_id?: string | null
) {
  await tx
    .update(ai_batch_responses)
    .set({
      metadata,
      output_resolved: true,
      ...(output_file_id != null ? { output_file_id } : {})
    })
    .where(
      and(eq(ai_batch_responses.batch_id, batch_id), eq(ai_batch_responses.custom_id, custom_id))
    );
}

/** Connects uploaded image to puzzle and removes the batch response row. */
export const approve_connect_puzzle_image_id_func = async (batch_id: string, custom_id: string) => {
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
        message: `Puzzle image not ready for batch_id ${batch_id} and custom_id ${custom_id}`
      });
    }
    const { uploaded_image_id, puzzle_id } = metadata;
    await Promise.all([
      tx
        .update(word_puzzles)
        .set({
          image_id: uploaded_image_id
        })
        .where(eq(word_puzzles.id, puzzle_id)),
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
      success: true,
      puzzle_id,
      uploaded_image_id
    };
  });
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
  const result: PollBatchPuzzleImageGenCoreResult = await db.transaction(async (tx) => {
    const db_rows = await tx.query.ai_batch_responses.findMany({
      where: eq(ai_batch_responses.batch_id, batch_id)
    });
    if (db_rows.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No batch responses found for batch_id ${batch_id}`
      });
    }

    if (db_rows.every((row) => row.output_resolved)) {
      return {
        status: 'already_resolved' as const,
        batch_id,
        items: db_rows.map((row) =>
          toPollItem(row.custom_id, image_batch_metadata_schema.parse(row.metadata))
        )
      };
    }

    const batch = await getAiBatchResult(openai, batch_id, {
      outputs: db_rows.map((row) => ({ type: 'image' as const, custom_id: row.custom_id }))
    });

    const batch_output_file_id = batch.output_file_id ?? null;

    if (batch.status !== 'completed') {
      const openai_status = batch.status;

      if (TERMINAL_FAILURE_STATUSES.has(openai_status)) {
        await Promise.all(
          db_rows.map((row) =>
            updateBatchRow(
              tx,
              batch_id,
              row.custom_id,
              {
                ...image_batch_metadata_schema.parse(row.metadata),
                success: false
              },
              batch_output_file_id
            )
          )
        );
        return {
          status: 'terminal_failure' as const,
          batch_id,
          openai_status
        };
      }

      return { status: 'pending' as const, batch_id, openai_status };
    }

    const output_by_custom_id = new Map(
      [...batch.responses, ...batch.errors].map((output) => [output.custom_id, output])
    );

    const items: PollBatchPuzzleImageGenItem[] = [];

    for (const row of db_rows) {
      const metadata = image_batch_metadata_schema.parse(row.metadata);

      if (row.output_resolved) {
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

    return { status: 'processed' as const, batch_id, items };
  });

  if (result.status === 'pending') {
    return {
      ...result,
      message: `Batch is still ${result.openai_status}; try again later.`
    };
  }

  if (result.status === 'terminal_failure') {
    return {
      ...result,
      message: `Batch ended with status ${result.openai_status}; outputs marked as failed.`
    };
  }

  if (result.status === 'already_resolved') {
    const items = await autoApproveEligibleRows(batch_id, result.items);
    return {
      ...result,
      items,
      message: buildProcessedMessage(items)
    };
  }

  const items = await autoApproveEligibleRows(batch_id, result.items);
  return {
    ...result,
    items,
    message: buildProcessedMessage(items)
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
  const metadata = image_batch_metadata_schema.parse(row.metadata);
  const puzzle_id = metadata.puzzle_id ?? parsePuzzleIdFromBatchCustomId(row.custom_id);
  let puzzle_title: string | null = null;
  if (puzzle_id !== null) {
    const puzzle = await db.query.word_puzzles.findFirst({
      columns: { title: true },
      where: eq(word_puzzles.id, puzzle_id)
    });
    puzzle_title = puzzle?.title ?? null;
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
    puzzle_id,
    puzzle_title,
    image_asset,
    status: derivePuzzleImageBatchUiStatus(row.output_resolved, metadata, row.auto_approved)
  };
}

const get_puzzle_image_batch_status_route = protectedAdminProcedure
  .input(z.object({ puzzle_id: z.number().int() }))
  .query(async ({ input: { puzzle_id } }) => {
    const custom_id = getPuzzleImageBatchCustomId(puzzle_id);
    const rows = await db.query.ai_batch_responses.findMany({
      where: and(eq(ai_batch_responses.custom_id, custom_id), eq(ai_batch_responses.type, 'image'))
    });
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
          !row.auto_approved
      ) ??
      rows[rows.length - 1];

    return await enrichBatchRowWithAssetAndPuzzle(active_row);
  });

const get_batch_manager_groups_route = protectedAdminProcedure.query(async () => {
  const rows = await db.query.ai_batch_responses.findMany({
    where: eq(ai_batch_responses.type, 'image'),
    orderBy: [desc(ai_batch_responses.batch_id)]
  });

  const puzzle_ids = new Set<number>();
  const image_ids = new Set<number>();
  for (const row of rows) {
    const metadata = image_batch_metadata_schema.parse(row.metadata);
    if (metadata.puzzle_id !== undefined) {
      puzzle_ids.add(metadata.puzzle_id);
    } else {
      const parsed = parsePuzzleIdFromBatchCustomId(row.custom_id);
      if (parsed !== null) puzzle_ids.add(parsed);
    }
    if (metadata.uploaded_image_id !== undefined) {
      image_ids.add(metadata.uploaded_image_id);
    }
  }

  const [puzzles, assets] = await Promise.all([
    puzzle_ids.size > 0
      ? db.query.word_puzzles.findMany({
          columns: { id: true, title: true },
          where: inArray(word_puzzles.id, [...puzzle_ids])
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
    const metadata = image_batch_metadata_schema.parse(row.metadata);
    const puzzle_id = metadata.puzzle_id ?? parsePuzzleIdFromBatchCustomId(row.custom_id);
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
      else if (item.status === 'ready_for_review') counts.ready++;
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

    const metadata = image_batch_metadata_schema.parse(row.metadata);
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

    return {
      success: true,
      deleted_image_id,
      puzzle_id: metadata.puzzle_id ?? parsePuzzleIdFromBatchCustomId(custom_id)
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

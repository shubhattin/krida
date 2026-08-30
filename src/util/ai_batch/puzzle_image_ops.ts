import { Effect, Schedule } from 'effect';
import { dbRun, dbTransaction, type DbTransaction } from '~/effect/database';
import {
  generateImagePrompt,
  generateFileNameAndDescription,
  generateSavePuzzleImage,
  OPENAI_MODELS,
  IMAGE_CONFIG
} from '~/util/ai/image_gen';
import { createAiBatch, getAiBatchResult, type AiBatchInput } from '~/util/ai_batch';
import type { AiBatchPollingStatus } from '~/util/ai_batch/types';
import {
  ai_batches,
  ai_batch_responses,
  image_assets,
  padavali_puzzles,
  crossword_puzzles
} from '~/db/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  BATCH_POLLING_INTERVAL_S,
  batch_metadata_schema,
  type BatchMetadata,
  type PuzzleImageGame
} from '~/util/types/ai_batch_metadata';
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
import { runServerEffect } from '~/effect/run';
import { OpenAiBatchClient } from '~/effect/ai';
import { QStashPublisher } from '~/effect/qstash';
import { ObjectStorage } from '~/effect/storage';
import { enqueueBackground } from '~/effect/background';
import { BadRequestError, BatchError, NotFoundError, isKnownError } from '~/effect/errors';

/** Cap concurrent Effect fan-outs for prompt/upload/approve work. */
const BATCH_EFFECT_CONCURRENCY = 4;

const s3DeleteRetrySchedule = Schedule.recurs(2).pipe(
  Schedule.addDelay(() => Effect.succeed('1 second'))
);

export type TriggerPuzzleImageInput = {
  puzzle_id: number;
  title?: string;
  description?: string;
  /** Optional Sanskrit words for richer prompt context (both games). */
  words?: string[];
  /** Optional extra instructions for the image-prompt LLM. */
  extra_instructions?: string;
};

export type TriggerBatchPuzzleImageGenInput = {
  game: PuzzleImageGame;
  auto_approved: boolean;
  puzzles: TriggerPuzzleImageInput[];
};

export function parseBatchMetadata(metadata: BatchMetadata): BatchMetadata {
  return batch_metadata_schema.parse(metadata);
}

export function tryParseBatchMetadata(metadata: BatchMetadata): BatchMetadata | null {
  const parsed = batch_metadata_schema.safeParse(metadata);
  return parsed.success ? parsed.data : null;
}

export function resolveBatchGame(metadata: BatchMetadata, custom_id: string): PuzzleImageGame {
  return metadata.game ?? parsePuzzleIdFromBatchCustomId(custom_id)?.game ?? 'padavali';
}

export function buildImageBatchMetadata(args: {
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
export const POLL_CLAIM_STALE_MS = ms('12mins');

/** True when an existing `poll_claimed_at` is still within the exclusive claim window. */
export function isPollClaimActive(
  poll_claimed_at: string | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!poll_claimed_at) return false;
  const claimed_at = Date.parse(poll_claimed_at);
  if (Number.isNaN(claimed_at)) return false;
  return nowMs - claimed_at < POLL_CLAIM_STALE_MS;
}

export const deleteImageAssetById = Effect.fn('batch_ai.deleteImageAssetById')(function* (
  image_id: number
) {
  const asset = yield* dbRun('batch_ai.find_image_asset_for_delete', (client) =>
    client.query.image_assets.findFirst({
      columns: { id: true, s3_key: true },
      where: eq(image_assets.id, image_id)
    })
  );
  if (!asset) {
    return { deleted: false };
  }

  const deleted = yield* dbRun('batch_ai.delete_image_asset_row', (client) =>
    client.delete(image_assets).where(eq(image_assets.id, image_id)).returning()
  );
  if (deleted[0] === undefined) {
    return { deleted: false };
  }

  const storage = yield* ObjectStorage;
  yield* storage.deleteAssetFile(asset.s3_key).pipe(
    Effect.retry(s3DeleteRetrySchedule),
    Effect.catchTag('StorageError', (error) =>
      Effect.logWarning('Failed to delete image asset from storage after DB delete').pipe(
        Effect.annotateLogs({
          s3_key: asset.s3_key,
          operation: error.operation
        })
      )
    )
  );

  return { deleted: true };
});

/** Delete OpenAI Files API objects (batch input/output). Ignores already-deleted files. */
const deleteOpenAiFiles = Effect.fn('batch_ai.deleteOpenAiFiles')(function* (
  file_ids: ReadonlyArray<string | null | undefined>
) {
  const unique_ids = [...new Set(file_ids.filter((id): id is string => !!id))];
  if (unique_ids.length === 0) return;

  const { client } = yield* OpenAiBatchClient;
  yield* Effect.forEach(
    unique_ids,
    (file_id) =>
      Effect.tryPromise({
        try: () => client.files.delete(file_id),
        catch: (cause) => BatchError.make({ operation: 'delete_file', cause })
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            console.error(`Failed to delete OpenAI file ${file_id}:`, error);
          })
        )
      ),
    { concurrency: 'unbounded', discard: true }
  );
});

/**
 * File ids live on ai_batches (shared across custom_ids).
 * After the last response row is gone, delete the batch row and OpenAI files.
 */
export const scheduleOpenAiBatchCleanup = Effect.fn('batch_ai.scheduleOpenAiBatchCleanup')(
  function* (batch_id: string) {
    yield* enqueueBackground(() =>
      runServerEffect(
        Effect.gen(function* () {
          const remaining = yield* dbRun('batch_ai.cleanup.find_remaining_response', (client) =>
            client.query.ai_batch_responses.findFirst({
              columns: { batch_id: true },
              where: eq(ai_batch_responses.batch_id, batch_id)
            })
          );
          if (remaining) return;

          const batch = yield* dbRun('batch_ai.cleanup.find_batch', (client) =>
            client.query.ai_batches.findFirst({
              columns: { input_file_id: true, output_file_id: true },
              where: eq(ai_batches.batch_id, batch_id)
            })
          );
          if (!batch) return;

          yield* dbRun('batch_ai.cleanup.delete_batch', async (client) => {
            await client.delete(ai_batches).where(eq(ai_batches.batch_id, batch_id));
          });
          yield* deleteOpenAiFiles([batch.input_file_id, batch.output_file_id]);
        }).pipe(
          Effect.catch((err) =>
            Effect.sync(() => {
              console.error(`Failed OpenAI batch file cleanup for batch ${batch_id}:`, err);
            })
          )
        )
      )
    );
  }
);

/** Item not yet finalized — same role as the old `output_resolved = false` row filter. */
const responseItemUnprocessed = sql`${ai_batch_responses.metadata}->>'success' IS NULL`;

export const tryClaimBatchRow = Effect.fn('batch_ai.tryClaimBatchRow')(function* (
  batch_id: string,
  custom_id: string
) {
  return yield* dbTransaction('batch_ai.try_claim_batch_row', async (tx) => {
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
    if (isPollClaimActive(metadata.poll_claimed_at)) {
      return null;
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
});

export const trigger_batch_puzzle_image_gen = Effect.fn('batch_ai.trigger_batch_puzzle_image_gen')(
  function* (input: TriggerBatchPuzzleImageGenInput) {
    const { game, auto_approved, puzzles: puzzle_inputs } = input;
    const puzzle_ids = puzzle_inputs.map((puzzle) => puzzle.puzzle_id);

    const db_puzzles = yield* dbRun('batch_ai.find_puzzles_for_trigger', (client) =>
      game === 'crossword'
        ? client.query.crossword_puzzles.findMany({
            columns: {
              id: true,
              title: true,
              description: true
            },
            where: (tbl, { inArray: inArr }) => inArr(tbl.id, puzzle_ids)
          })
        : client.query.padavali_puzzles.findMany({
            columns: {
              id: true,
              title: true,
              description: true
            },
            where: (tbl, { inArray: inArr }) => inArr(tbl.id, puzzle_ids)
          })
    );

    if (db_puzzles.length !== puzzle_ids.length) {
      return yield* Effect.fail(
        BadRequestError.make({
          message: 'Some puzzles not found'
        })
      );
    }

    const puzzle_by_id = new Map(db_puzzles.map((puzzle) => [puzzle.id, puzzle]));
    const resolved_puzzles: Array<{
      id: number;
      title: string;
      description: string;
      words: string[] | undefined;
      extra_instructions: string | undefined;
    }> = [];
    for (const puzzle_input of puzzle_inputs) {
      const db_puzzle = puzzle_by_id.get(puzzle_input.puzzle_id);
      if (!db_puzzle) {
        return yield* Effect.fail(
          BadRequestError.make({
            message: 'Some puzzles not found'
          })
        );
      }
      resolved_puzzles.push({
        id: puzzle_input.puzzle_id,
        title: puzzle_input.title ?? db_puzzle.title,
        description: puzzle_input.description ?? db_puzzle.description ?? '',
        words: puzzle_input.words,
        extra_instructions: puzzle_input.extra_instructions
      });
    }

    const image_prompts = yield* Effect.all(
      resolved_puzzles.map((puzzle) =>
        generateImagePrompt(
          puzzle.title,
          puzzle.description,
          puzzle.words,
          puzzle.extra_instructions
        )
      ),
      { concurrency: BATCH_EFFECT_CONCURRENCY }
    );
    const file_name_descriptions = yield* Effect.all(
      image_prompts.map((image_prompt) => generateFileNameAndDescription(image_prompt)),
      { concurrency: BATCH_EFFECT_CONCURRENCY }
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

    const { batch_id, input_file_id } = yield* createAiBatch(batch_requests);

    yield* Effect.gen(function* () {
      yield* dbTransaction('batch_ai.insert_batch_rows', async (tx) => {
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

      const qstash = yield* QStashPublisher;
      yield* qstash.publishAiBatchResults({ batch_id, poll_attempt: 0 }, BATCH_POLLING_INTERVAL_S);
    }).pipe(
      Effect.catch((err) =>
        Effect.gen(function* () {
          const { client } = yield* OpenAiBatchClient;
          yield* Effect.tryPromise({
            try: () => client.batches.cancel(batch_id),
            catch: (cause) =>
              BatchError.make({ operation: 'cancel_batch', batchId: batch_id, cause })
          }).pipe(
            Effect.catch((cancel_err) =>
              Effect.sync(() => {
                console.error(`Failed to cancel orphaned OpenAI batch ${batch_id}:`, cancel_err);
              })
            )
          );
          return yield* Effect.fail(err);
        })
      )
    );

    return { batch_id, puzzle_count: resolved_puzzles.length, game };
  }
);

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
  tx: DbTransaction,
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
  tx: DbTransaction,
  batch_id: string,
  output_file_id?: string | null
) {
  const updates: Partial<typeof ai_batches.$inferInsert> = { output_resolved: true };
  if (output_file_id != null) updates.output_file_id = output_file_id;

  await tx
    .update(ai_batches)
    .set(updates)
    .where(
      and(
        eq(ai_batches.batch_id, batch_id),
        eq(ai_batches.output_resolved, false),
        sql`NOT EXISTS (
          SELECT 1 FROM ${ai_batch_responses}
          WHERE ${ai_batch_responses.batch_id} = ${batch_id}
            AND ${ai_batch_responses.metadata}->>'success' IS NULL
        )`
      )
    );
}

type ApproveConnectTxResult =
  | {
      ok: true;
      success: true;
      puzzle_id: number;
      uploaded_image_id: number;
      game: PuzzleImageGame;
      slug: string;
      listed: boolean;
    }
  | { ok: false; kind: 'not_found'; resource: string; message: string }
  | { ok: false; kind: 'bad_request'; message: string };

/** Connects uploaded image to puzzle and removes the batch response row. */
export const approve_connect_puzzle_image_id = Effect.fn(
  'batch_ai.approve_connect_puzzle_image_id'
)(function* (batch_id: string, custom_id: string) {
  const tx_result = yield* dbTransaction(
    'batch_ai.approve_connect_puzzle_image',
    async (tx): Promise<ApproveConnectTxResult> => {
      const ai_batch_data = await tx.query.ai_batch_responses.findFirst({
        where: and(
          eq(ai_batch_responses.batch_id, batch_id),
          eq(ai_batch_responses.custom_id, custom_id)
        )
      });
      if (!ai_batch_data) {
        return {
          ok: false,
          kind: 'not_found',
          resource: 'ai_batch_response',
          message: `No metadata found for batch_id ${batch_id} and custom_id ${custom_id}`
        };
      }
      const metadata = parseBatchMetadata(ai_batch_data.metadata);
      if (metadata.success !== true || metadata.uploaded_image_id === undefined) {
        return {
          ok: false,
          kind: 'bad_request',
          message: `Puzzle image not ready for batch_id ${batch_id} and custom_id ${custom_id}`
        };
      }
      const { uploaded_image_id, puzzle_id } = metadata;
      const game = resolveBatchGame(metadata, custom_id);

      if (game === 'crossword') {
        const puzzle = await tx.query.crossword_puzzles.findFirst({
          columns: { slug: true, listed: true },
          where: eq(crossword_puzzles.id, puzzle_id)
        });
        if (!puzzle) {
          return {
            ok: false,
            kind: 'not_found',
            resource: 'crossword_puzzle',
            message: `Puzzle not found for batch_id ${batch_id} and custom_id ${custom_id}`
          };
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
          ok: true,
          success: true,
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
        return {
          ok: false,
          kind: 'not_found',
          resource: 'padavali_puzzle',
          message: `Puzzle not found for batch_id ${batch_id} and custom_id ${custom_id}`
        };
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
        ok: true,
        success: true,
        puzzle_id,
        uploaded_image_id,
        game,
        slug: puzzle.slug,
        listed: puzzle.listed
      };
    }
  );

  if (!tx_result.ok) {
    if (tx_result.kind === 'not_found') {
      return yield* Effect.fail(
        NotFoundError.make({
          resource: tx_result.resource,
          message: tx_result.message
        })
      );
    }
    return yield* Effect.fail(BadRequestError.make({ message: tx_result.message }));
  }

  const result = tx_result;

  if (result.game === 'crossword') {
    const current_schedule = yield* CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS);
    yield* Effect.all(
      [
        current_schedule?.puzzle.id === result.puzzle_id
          ? invalidate_and_refresh_cache(CACHE.crossword.current_schedule, NO_CACHE_PARAMS)
          : Effect.void,
        invalidate_and_refresh_cache(CACHE.crossword.word_puzzle, { slug: result.slug }),
        result.listed
          ? invalidate_and_refresh_cache(CACHE.crossword.listed_puzzle_list, NO_CACHE_PARAMS)
          : Effect.void
      ],
      { concurrency: 'unbounded' }
    );
  } else {
    const current_schedule = yield* CACHE.padavali.current_schedule.get(NO_CACHE_PARAMS);
    yield* Effect.all(
      [
        current_schedule?.puzzle.id === result.puzzle_id
          ? invalidate_and_refresh_cache(CACHE.padavali.current_schedule, NO_CACHE_PARAMS)
          : Effect.void,
        invalidate_and_refresh_cache(CACHE.padavali.word_puzzle, { slug: result.slug }),
        result.listed
          ? invalidate_and_refresh_cache(CACHE.padavali.listed_puzzle_list, NO_CACHE_PARAMS)
          : Effect.void
      ],
      { concurrency: 'unbounded' }
    );
  }

  yield* scheduleOpenAiBatchCleanup(batch_id);

  return {
    success: result.success,
    puzzle_id: result.puzzle_id,
    uploaded_image_id: result.uploaded_image_id,
    game: result.game
  };
});

const autoApproveEligibleRows = Effect.fn('batch_ai.autoApproveEligibleRows')(function* (
  batch_id: string,
  items: PollBatchPuzzleImageGenItem[]
) {
  const rows = yield* dbRun('batch_ai.find_auto_approve_rows', (client) =>
    client.query.ai_batch_responses.findMany({
      where: eq(ai_batch_responses.batch_id, batch_id),
      columns: { custom_id: true, auto_approved: true }
    })
  );
  const auto_approved_custom_ids = new Set(
    rows.filter((row) => row.auto_approved).map((row) => row.custom_id)
  );

  return yield* Effect.forEach(
    items,
    (item) =>
      Effect.gen(function* () {
        if (!item.success || !auto_approved_custom_ids.has(item.custom_id)) {
          return item;
        }

        return yield* approve_connect_puzzle_image_id(batch_id, item.custom_id).pipe(
          Effect.map((result) => ({
            ...item,
            message: `Auto-connected image ${result.uploaded_image_id} to puzzle ${result.puzzle_id}`
          })),
          Effect.catch((err) =>
            Effect.succeed({
              ...item,
              message:
                isKnownError(err) &&
                (err._tag === 'NotFoundError' || err._tag === 'BadRequestError')
                  ? err.message
                  : 'Auto-approve failed to connect puzzle image'
            })
          )
        );
      }),
    { concurrency: BATCH_EFFECT_CONCURRENCY }
  );
});

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

const loadResolvedPollItem = Effect.fn('batch_ai.loadResolvedPollItem')(function* (
  batch_id: string,
  custom_id: string
) {
  const resolved_row = yield* dbRun('batch_ai.find_resolved_response', (client) =>
    client.query.ai_batch_responses.findFirst({
      where: and(
        eq(ai_batch_responses.batch_id, batch_id),
        eq(ai_batch_responses.custom_id, custom_id)
      )
    })
  );
  if (!resolved_row) return null;
  return toPollItem(resolved_row.custom_id, parseBatchMetadata(resolved_row.metadata));
});

const markItemFailed = Effect.fn('batch_ai.markItemFailed')(function* (
  batch_id: string,
  custom_id: string,
  metadata: BatchMetadata,
  batch_output_file_id: string | null
) {
  const wrote = yield* dbTransaction('batch_ai.mark_item_failed', async (tx) => {
    const ok = await updateBatchResponse(tx, batch_id, custom_id, {
      ...metadata,
      success: false
    });
    await markBatchOutputResolvedIfComplete(tx, batch_id, batch_output_file_id);
    return ok;
  });

  if (wrote) {
    return { custom_id, success: false } satisfies PollBatchPuzzleImageGenItem;
  }

  return yield* loadResolvedPollItem(batch_id, custom_id);
});

type BatchResponseRow = Pick<typeof ai_batch_responses.$inferSelect, 'custom_id' | 'metadata'>;

/** Read back a row that another worker already finalized; null while it is still unprocessed. */
const findResolvedRowItem = Effect.fn('batch_ai.findResolvedRowItem')(function* (
  db_span: string,
  batch_id: string,
  custom_id: string
) {
  const resolved_row = yield* dbRun(db_span, (client) =>
    client.query.ai_batch_responses.findFirst({
      where: and(
        eq(ai_batch_responses.batch_id, batch_id),
        eq(ai_batch_responses.custom_id, custom_id)
      )
    })
  );
  if (!resolved_row) return null;
  const resolved_metadata = parseBatchMetadata(resolved_row.metadata);
  if (!isResponseItemProcessed(resolved_metadata)) return null;
  return toPollItem(resolved_row.custom_id, resolved_metadata);
});

const markItemFailedAndCollect = Effect.fn('batch_ai.markItemFailedAndCollect')(function* (
  batch_id: string,
  custom_id: string,
  metadata: BatchMetadata,
  batch_output_file_id: string | null,
  items: PollBatchPuzzleImageGenItem[]
) {
  const failed_item = yield* markItemFailed(batch_id, custom_id, metadata, batch_output_file_id);
  if (failed_item) items.push(failed_item);
});

function isSuccessfulImageOutput(
  output: { success: boolean; type: string; image_b64?: string } | undefined
): output is { success: true; type: 'image'; image_b64: string } {
  return (
    output !== undefined &&
    output.success &&
    output.type === 'image' &&
    output.image_b64 !== undefined &&
    output.image_b64.length > 0
  );
}

/** Mark every still-unprocessed row as failed and snapshot the batch output file id. */
const markTerminalFailure = Effect.fn('batch_ai.markTerminalFailure')(function* (
  batch_id: string,
  db_rows: BatchResponseRow[],
  batch_output_file_id: string | null
) {
  yield* dbTransaction('batch_ai.mark_terminal_failure', async (tx) => {
    const unprocessed_rows = db_rows.filter(
      (row) => !isResponseItemProcessed(parseBatchMetadata(row.metadata))
    );
    if (unprocessed_rows.length > 0) {
      const value_rows = unprocessed_rows.map((row) => {
        const metadata = {
          ...parseBatchMetadata(row.metadata),
          success: false
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
});

/** Drop a duplicate upload and resolve the row state after losing the write race. */
const cleanupLostUpload = Effect.fn('batch_ai.cleanupLostUpload')(function* (
  batch_id: string,
  custom_id: string,
  upload_image_id: number
) {
  yield* deleteImageAssetById(upload_image_id).pipe(
    Effect.catch((err) =>
      Effect.sync(() => {
        console.error(`Failed to clean up duplicate batch upload image ${upload_image_id}:`, err);
      })
    )
  );
  return yield* findResolvedRowItem('batch_ai.find_row_after_cas_loss', batch_id, custom_id);
});

export const poll_batch_puzzle_image_gen = Effect.fn('poll_batch_puzzle_image_gen')(function* (
  batch_id: string
) {
  const ai_batch = yield* dbRun('batch_ai.find_batch_with_responses', (client) =>
    client.query.ai_batches.findFirst({
      where: eq(ai_batches.batch_id, batch_id),
      with: { responses: true }
    })
  );
  if (!ai_batch || ai_batch.responses.length === 0) {
    return yield* Effect.fail(
      NotFoundError.make({
        resource: 'ai_batch',
        message: `No batch responses found for batch_id ${batch_id}`
      })
    );
  }

  const db_rows = ai_batch.responses;

  if (ai_batch.output_resolved) {
    const items = yield* autoApproveEligibleRows(
      batch_id,
      db_rows.map((row) => toPollItem(row.custom_id, parseBatchMetadata(row.metadata)))
    );
    return {
      status: 'already_resolved',
      batch_id,
      items,
      message: buildProcessedMessage(items)
    } satisfies PollBatchPuzzleImageGenResult;
  }

  const batch = yield* getAiBatchResult(batch_id, {
    outputs: db_rows.map((row) => ({ type: 'image', custom_id: row.custom_id }))
  });
  const batch_output_file_id = batch.output_file_id ?? null;

  if (batch.status !== 'completed') {
    const openai_status = batch.status;

    if (TERMINAL_FAILURE_STATUSES.has(openai_status)) {
      yield* markTerminalFailure(batch_id, db_rows, batch_output_file_id);
      return {
        status: 'terminal_failure',
        batch_id,
        openai_status,
        message: `Batch ended with status ${openai_status}; outputs marked as failed.`
      } satisfies PollBatchPuzzleImageGenResult;
    }

    return {
      status: 'pending',
      batch_id,
      openai_status,
      message: `Batch is still ${openai_status}; try again later.`
    } satisfies PollBatchPuzzleImageGenResult;
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

    const claimed_row = yield* tryClaimBatchRow(batch_id, row.custom_id);
    if (!claimed_row) {
      const resolved_item = yield* findResolvedRowItem(
        'batch_ai.find_claimed_or_resolved_row',
        batch_id,
        row.custom_id
      );
      if (resolved_item) items.push(resolved_item);
      continue;
    }

    const metadata = parseBatchMetadata(claimed_row.metadata);
    const output = output_by_custom_id.get(row.custom_id);

    if (!isSuccessfulImageOutput(output)) {
      yield* markItemFailedAndCollect(
        batch_id,
        row.custom_id,
        metadata,
        batch_output_file_id,
        items
      );
      continue;
    }

    const upload_result = yield* generateSavePuzzleImage(
      {
        title: '<batch>',
        existing_image_prompt: metadata.image_prompt,
        game: resolveBatchGame(metadata, row.custom_id)
      },
      undefined,
      output.image_b64,
      { file_name: metadata.file_name, description: metadata.image_description }
    );

    if (!upload_result.success) {
      yield* markItemFailedAndCollect(
        batch_id,
        row.custom_id,
        metadata,
        batch_output_file_id,
        items
      );
      continue;
    }

    const persisted = yield* dbTransaction('batch_ai.persist_uploaded_image', async (tx) => {
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
      const resolved_item = yield* cleanupLostUpload(batch_id, row.custom_id, upload_result.id);
      if (resolved_item) items.push(resolved_item);
      continue;
    }

    items.push({
      custom_id: row.custom_id,
      success: true,
      uploaded_image_id: upload_result.id
    });
  }

  const resolved_items = yield* autoApproveEligibleRows(batch_id, items);
  return {
    status: 'processed',
    batch_id,
    items: resolved_items,
    message: buildProcessedMessage(resolved_items)
  } satisfies PollBatchPuzzleImageGenResult;
});

type EnrichedBatchRow = {
  batch_id: string;
  custom_id: string;
  output_resolved: boolean;
  auto_approved: boolean;
  metadata: BatchMetadata;
  game: PuzzleImageGame;
  puzzle_id: number;
  puzzle_title: string | null;
  image_asset: {
    id: number;
    s3_key: string;
    width: number;
    height: number;
    description: string | null;
  } | null;
  status: ReturnType<typeof derivePuzzleImageBatchUiStatus>;
};

const enrichBatchRowWithAssetAndPuzzle = Effect.fn('batch_ai.enrichBatchRowWithAssetAndPuzzle')(
  function* (row: {
    batch_id: string;
    custom_id: string;
    output_resolved: boolean;
    auto_approved: boolean;
    metadata: BatchMetadata;
  }) {
    const metadata = parseBatchMetadata(row.metadata);
    const parsed_custom = parsePuzzleIdFromBatchCustomId(row.custom_id);
    const puzzle_id = metadata.puzzle_id ?? parsed_custom?.puzzle_id;
    if (puzzle_id === undefined) {
      return yield* Effect.fail(
        BadRequestError.make({
          message: `Batch row ${row.custom_id} is missing puzzle_id`
        })
      );
    }
    const game = resolveBatchGame(metadata, row.custom_id);
    let puzzle_title: string | null = null;
    if (game === 'crossword') {
      const puzzle = yield* dbRun('batch_ai.find_crossword_title', (client) =>
        client.query.crossword_puzzles.findFirst({
          columns: { title: true },
          where: eq(crossword_puzzles.id, puzzle_id)
        })
      );
      puzzle_title = puzzle?.title ?? null;
    } else {
      const puzzle = yield* dbRun('batch_ai.find_padavali_title', (client) =>
        client.query.padavali_puzzles.findFirst({
          columns: { title: true },
          where: eq(padavali_puzzles.id, puzzle_id)
        })
      );
      puzzle_title = puzzle?.title ?? null;
    }

    let image_asset: EnrichedBatchRow['image_asset'] = null;

    const uploaded_image_id = metadata.uploaded_image_id;
    if (uploaded_image_id !== undefined) {
      const asset = yield* dbRun('batch_ai.find_image_asset_for_enrich', (client) =>
        client.query.image_assets.findFirst({
          columns: {
            id: true,
            s3_key: true,
            width: true,
            height: true,
            description: true
          },
          where: eq(image_assets.id, uploaded_image_id)
        })
      );
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
    } satisfies EnrichedBatchRow;
  }
);

export const get_puzzle_image_batch_status = Effect.fn('batch_ai.get_puzzle_image_batch_status')(
  function* (puzzle_id: number, game: PuzzleImageGame) {
    const custom_id = getPuzzleImageBatchCustomId(puzzle_id, game);
    const rows = yield* dbRun('batch_ai.select_puzzle_image_batch_status', (client) =>
      client
        .select({
          batch_id: ai_batch_responses.batch_id,
          custom_id: ai_batch_responses.custom_id,
          output_resolved: ai_batches.output_resolved,
          auto_approved: ai_batch_responses.auto_approved,
          metadata: ai_batch_responses.metadata
        })
        .from(ai_batch_responses)
        .innerJoin(ai_batches, eq(ai_batch_responses.batch_id, ai_batches.batch_id))
        .where(and(eq(ai_batch_responses.custom_id, custom_id), eq(ai_batches.type, 'image')))
    );
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

    return yield* enrichBatchRowWithAssetAndPuzzle(active_row);
  }
);

type BatchGroupCounts = {
  pending: number;
  ready: number;
  failed: number;
  auto_approved: number;
};

type BatchManagerRow = {
  batch_id: string;
  custom_id: string;
  output_resolved: boolean;
  auto_approved: boolean;
  metadata: BatchMetadata;
};

type BatchRowIds = { puzzle_ids: Set<number>; image_ids: Set<number> };

function collectBatchRowIds(rows: BatchManagerRow[]): BatchRowIds {
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
  return { puzzle_ids, image_ids };
}

function countGroupItems(items: EnrichedBatchRow[]): BatchGroupCounts {
  const counts = {
    pending: 0,
    ready: 0,
    failed: 0,
    auto_approved: 0
  };
  for (const item of items) {
    if (item.status === 'processing') counts.pending++;
    else if (item.status === 'ready_for_review' || item.status === 'auto_applying') counts.ready++;
    else if (item.status === 'failed') counts.failed++;
    if (item.auto_approved) counts.auto_approved++;
  }
  return counts;
}

export const get_batch_manager_groups = Effect.fn('batch_ai.get_batch_manager_groups')(function* (
  game: PuzzleImageGame
) {
  const batches = yield* dbRun('batch_ai.list_image_batches', (client) =>
    client.query.ai_batches.findMany({
      where: eq(ai_batches.type, 'image'),
      orderBy: [desc(ai_batches.batch_id)],
      with: { responses: true }
    })
  );

  const rows = batches.flatMap((batch) =>
    batch.responses.flatMap((response) => {
      const metadata = tryParseBatchMetadata(response.metadata);
      if (!metadata) return [];
      if (resolveBatchGame(metadata, response.custom_id) !== game) return [];
      return [
        {
          batch_id: batch.batch_id,
          custom_id: response.custom_id,
          output_resolved: batch.output_resolved,
          auto_approved: response.auto_approved,
          metadata
        } satisfies BatchManagerRow
      ];
    })
  );

  const { puzzle_ids, image_ids } = collectBatchRowIds(rows);

  const puzzle_id_list = [...puzzle_ids];
  const { puzzles, assets } = yield* Effect.all({
    puzzles:
      // SAFETY: empty list stands in for the findMany rows (id + title) when there are none
      puzzle_id_list.length > 0
        ? dbRun('batch_ai.find_puzzles_for_manager', (client) =>
            game === 'crossword'
              ? client.query.crossword_puzzles.findMany({
                  columns: { id: true, title: true },
                  where: inArray(crossword_puzzles.id, puzzle_id_list)
                })
              : client.query.padavali_puzzles.findMany({
                  columns: { id: true, title: true },
                  where: inArray(padavali_puzzles.id, puzzle_id_list)
                })
          )
        : Effect.succeed([] as Array<{ id: number; title: string }>),
    assets:
      image_ids.size > 0
        ? dbRun('batch_ai.find_assets_for_manager', (client) =>
            client.query.image_assets.findMany({
              columns: {
                id: true,
                s3_key: true,
                width: true,
                height: true,
                description: true
              },
              where: inArray(image_assets.id, [...image_ids])
            })
          )
        : Effect.succeed(
            // SAFETY: empty list stands in for findMany rows with these exact columns
            [] as Array<{
              id: number;
              s3_key: string;
              width: number;
              height: number;
              description: string | null;
            }>
          )
  });

  const puzzle_by_id = new Map(puzzles.map((puzzle) => [puzzle.id, puzzle]));
  const asset_by_id = new Map(assets.map((asset) => [asset.id, asset]));

  const groups = new Map<string, { batch_id: string; items: EnrichedBatchRow[] }>();

  for (const row of rows) {
    const metadata = row.metadata;
    const puzzle_id =
      metadata.puzzle_id ?? parsePuzzleIdFromBatchCustomId(row.custom_id)?.puzzle_id;
    if (puzzle_id === undefined) continue;
    const puzzle_title = puzzle_by_id.get(puzzle_id)?.title ?? null;
    const image_asset =
      metadata.uploaded_image_id !== undefined
        ? (asset_by_id.get(metadata.uploaded_image_id) ?? null)
        : null;

    const item: EnrichedBatchRow = {
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

  return [...groups.values()].map((group) => ({ ...group, counts: countGroupItems(group.items) }));
});

export const discard_puzzle_image_batch_response = Effect.fn(
  'batch_ai.discard_puzzle_image_batch_response'
)(function* (batch_id: string, custom_id: string, delete_image_asset = false) {
  const row = yield* dbRun('batch_ai.find_response_for_discard', (client) =>
    client.query.ai_batch_responses.findFirst({
      where: and(
        eq(ai_batch_responses.batch_id, batch_id),
        eq(ai_batch_responses.custom_id, custom_id)
      )
    })
  );
  if (!row) {
    return yield* Effect.fail(
      NotFoundError.make({
        resource: 'ai_batch_response',
        message: `No batch response found for batch_id ${batch_id} and custom_id ${custom_id}`
      })
    );
  }

  const metadata = parseBatchMetadata(row.metadata);
  let deleted_image_id: number | null = null;
  if (delete_image_asset && metadata.uploaded_image_id !== undefined) {
    yield* deleteImageAssetById(metadata.uploaded_image_id);
    deleted_image_id = metadata.uploaded_image_id;
  }

  yield* dbRun('batch_ai.delete_batch_response', async (client) => {
    await client
      .delete(ai_batch_responses)
      .where(
        and(eq(ai_batch_responses.batch_id, batch_id), eq(ai_batch_responses.custom_id, custom_id))
      );
  });

  yield* scheduleOpenAiBatchCleanup(batch_id);

  return {
    success: true,
    deleted_image_id,
    puzzle_id: metadata.puzzle_id ?? parsePuzzleIdFromBatchCustomId(custom_id)?.puzzle_id ?? null
  };
});

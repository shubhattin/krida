import { createFileRoute } from '@tanstack/react-router';
import { Effect } from 'effect';
import { poll_batch_puzzle_image_gen } from '~/util/ai_batch/puzzle_image_ops';
import { BATCH_POLLING_INTERVAL_S, MAX_BATCH_POLL_ATTEMPTS } from '~/util/types/ai_batch_metadata';
import { aiBatchResultsPayloadSchema, decodeQstashPayload, QStashPublisher } from '~/effect/qstash';
import { runQstashEffect } from '~/effect/run';
import { verifyQstashRequest } from '~/lib/qstash_verify';

export const Route = createFileRoute('/api/qstash/save_ai_batch_results')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log('QStash AI batch poll request received', new Date());
        const verified = await verifyQstashRequest(request);
        if (!verified.ok) return verified.response;
        const body = verified.body;

        return runQstashEffect(
          Effect.gen(function* () {
            const { batch_id, poll_attempt } = yield* decodeQstashPayload(
              aiBatchResultsPayloadSchema,
              body
            );

            if (poll_attempt >= MAX_BATCH_POLL_ATTEMPTS) {
              return `Batch ${batch_id} exceeded max poll attempts (${MAX_BATCH_POLL_ATTEMPTS})`;
            }

            const result = yield* poll_batch_puzzle_image_gen(batch_id);

            if (result.status === 'already_resolved') {
              return `Batch ${batch_id} already resolved`;
            }

            if (result.status === 'pending') {
              const qstash = yield* QStashPublisher;
              yield* qstash.publishAiBatchResults(
                { batch_id, poll_attempt: poll_attempt + 1 },
                BATCH_POLLING_INTERVAL_S
              );
              return `Batch ${batch_id} still ${result.openai_status}; next poll scheduled in ${BATCH_POLLING_INTERVAL_S}s (attempt ${poll_attempt + 1}/${MAX_BATCH_POLL_ATTEMPTS})`;
            }

            if (result.status === 'terminal_failure') {
              return `Batch ${batch_id} failed with status ${result.openai_status}`;
            }

            const succeeded = result.items.filter((item) => item.success).length;
            return `Batch ${batch_id} processed: ${succeeded}/${result.items.length} items succeeded`;
          }),
          {
            onSuccess: (message) => new Response(message, { status: 200 })
          }
        );
      }
    }
  }
});

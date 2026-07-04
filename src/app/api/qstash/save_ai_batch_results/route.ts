import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { ai_batch_results_publish_schema, publishAiBatchResultsQueue } from '~/lib/qstash';
import { poll_batch_puzzle_image_gen_func } from '~/api/routers/batch_ai';
import { BATCH_POLLING_INTERVAL_S, MAX_BATCH_POLL_ATTEMPTS } from '~/util/types/ai_batch_metadata';

export const POST = verifySignatureAppRouter(async (req: Request) => {
  console.log('QStash AI batch poll request received', new Date());
  const body = await req.json();
  const { batch_id, poll_attempt } = ai_batch_results_publish_schema.parse(body);

  if (poll_attempt >= MAX_BATCH_POLL_ATTEMPTS) {
    return new Response(
      `Batch ${batch_id} exceeded max poll attempts (${MAX_BATCH_POLL_ATTEMPTS})`,
      {
        status: 200
      }
    );
  }

  const result = await poll_batch_puzzle_image_gen_func(batch_id);

  if (result.status === 'already_resolved') {
    return new Response(`Batch ${batch_id} already resolved`, { status: 200 });
  }

  if (result.status === 'pending') {
    await publishAiBatchResultsQueue(
      { batch_id, poll_attempt: poll_attempt + 1 },
      BATCH_POLLING_INTERVAL_S
    );
    return new Response(
      `Batch ${batch_id} still ${result.openai_status}; next poll scheduled in ${BATCH_POLLING_INTERVAL_S}s (attempt ${poll_attempt + 1}/${MAX_BATCH_POLL_ATTEMPTS})`,
      { status: 200 }
    );
  }

  if (result.status === 'terminal_failure') {
    return new Response(`Batch ${batch_id} failed with status ${result.openai_status}`, {
      status: 200
    });
  }

  const succeeded = result.items.filter((item) => item.success).length;
  return new Response(
    `Batch ${batch_id} processed: ${succeeded}/${result.items.length} items succeeded`,
    { status: 200 }
  );
});

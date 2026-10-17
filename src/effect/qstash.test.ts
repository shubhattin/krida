import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import {
  aiBatchResultsPayloadSchema,
  decodeQstashPayload,
  scheduleListingPayloadSchema
} from './qstash';

const KEY32 = 'abcdefghijklmnopqrstuvwxyz012345';

describe('decodeQstashPayload', () => {
  it('decodes a valid schedule listing payload', async () => {
    const value = await Effect.runPromise(
      decodeQstashPayload(scheduleListingPayloadSchema, {
        puzzle_id: 10,
        schedule_id: 3,
        listing_verify_key: KEY32
      })
    );

    expect(value).toEqual({
      puzzle_id: 10,
      schedule_id: 3,
      listing_verify_key: KEY32
    });
  });

  it('decodes an ai-batch payload', async () => {
    const batch = await Effect.runPromise(
      decodeQstashPayload(aiBatchResultsPayloadSchema, {
        batch_id: 'batch_abc',
        poll_attempt: 0
      })
    );
    expect(batch).toEqual({ batch_id: 'batch_abc', poll_attempt: 0 });
  });

  it('fails with ValidationError for invalid payloads', async () => {
    const result = await Effect.runPromise(
      decodeQstashPayload(scheduleListingPayloadSchema, {
        puzzle_id: -1,
        schedule_id: 3,
        listing_verify_key: 'short'
      }).pipe(Effect.flip)
    );
    expect(result._tag).toBe('ValidationError');
    expect(result.message).toBe('Invalid QStash payload');
  });
});

import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { aiRetryPolicy } from './ai';
import { AiProviderError } from './errors';

describe('aiRetryPolicy', () => {
  it('retries twice for a total of 3 attempts then fails', async () => {
    let attempts = 0;
    const result = await Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          attempts += 1;
          throw new Error(`transient-${attempts}`);
        },
        catch: (cause) =>
          AiProviderError.make({ operation: 'test_retry', provider: 'openai', cause })
      }).pipe(Effect.retry(aiRetryPolicy), Effect.flip)
    );

    expect(attempts).toBe(3);
    expect(result._tag).toBe('AiProviderError');
  });

  it('does not retry on success', async () => {
    let attempts = 0;
    const value = await Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          attempts += 1;
          return 'ok';
        },
        catch: (cause) =>
          AiProviderError.make({ operation: 'test_retry', provider: 'openai', cause })
      }).pipe(Effect.retry(aiRetryPolicy))
    );

    expect(attempts).toBe(1);
    expect(value).toBe('ok');
  });
});

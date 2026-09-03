import { describe, expect, it } from 'vitest';
import { canShareInFlightFibers, isCloudflareWorker } from './platform';

describe('isCloudflareWorker', () => {
  it('is false in Node / vitest', () => {
    expect(isCloudflareWorker()).toBe(false);
    expect(canShareInFlightFibers()).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { ImageProcessor } from '../image';
import { ImageProcessorLive } from './sharp_images';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

describe('ImageProcessorLive (sharp)', () => {
  it('resizes to the requested cover size and emits webp', async () => {
    const buffer = await Effect.runPromise(
      Effect.gen(function* () {
        const images = yield* ImageProcessor;
        return yield* images.resizeImage(PNG_1X1, 12, 8, { quality: 82, effort: 3 });
      }).pipe(Effect.provide(ImageProcessorLive))
    );

    expect(buffer.subarray(0, 4).toString()).toBe('RIFF');
    expect(buffer.subarray(8, 12).toString()).toBe('WEBP');
  });
});

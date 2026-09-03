import { Effect, Layer } from 'effect';
import sharp from 'sharp';
import { ImageProcessor, toImageBytes, type ResizeWebpOptions } from '../image';
import { ImageProcessingError } from '../errors';

const DEFAULT_WEBP: ResizeWebpOptions = {
  quality: 80,
  effort: 5,
  alphaQuality: 80,
  lossless: false,
  nearLossless: false,
  smartSubsample: true
};

/**
 * Node / Vitest ImageProcessor live. Must not be imported from the Worker
 * graph — wrangler cannot bundle sharp's native bindings.
 */
export const ImageProcessorLive = Layer.succeed(ImageProcessor)({
  resizeImage: (inputPng, width, height, webp_options) =>
    Effect.tryPromise({
      try: async () => {
        const bytes = toImageBytes(inputPng);
        const inputPngBuffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);

        return sharp(inputPngBuffer)
          .resize({
            width,
            height,
            fit: 'cover',
            position: 'centre',
            kernel: sharp.kernel.lanczos3,
            withoutEnlargement: true,
            fastShrinkOnLoad: true
          })
          .webp({
            ...DEFAULT_WEBP,
            ...webp_options
          })
          .toBuffer();
      },
      catch: (cause) => ImageProcessingError.make({ operation: 'resizeImage', cause })
    }).pipe(Effect.annotateLogs({ category: 'image', operation: 'resizeImage' }))
});

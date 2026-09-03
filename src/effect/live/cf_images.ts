import { Effect, Layer } from 'effect';
import { env } from 'cloudflare:workers';
import { ImageProcessor, toImageStream } from '../image';
import { ImageProcessingError } from '../errors';

const DEFAULT_QUALITY = 80;

/**
 * Workers ImageProcessor live via `env.IMAGES`.
 *
 * Sharp resize/cover/webp mapping:
 * - fit cover + centre crop → transform `fit: "cover"`, `gravity: "center"`
 * - webp quality → output `{ format: "image/webp", quality }`
 * - `withoutEnlargement` has no Images equivalent; puzzle sources are always larger
 *   than the 768×512 target so cover never upscales in practice
 * - lossless / nearLossless / effort / alphaQuality / smartSubsample are Sharp-only;
 *   Images always emits lossy WebP using `quality`
 */
export const ImageProcessorLive = Layer.succeed(ImageProcessor)({
  resizeImage: (inputPng, width, height, webp_options) =>
    Effect.tryPromise({
      try: async () => {
        const quality = webp_options?.quality ?? DEFAULT_QUALITY;

        const output = await env.IMAGES.input(toImageStream(inputPng))
          .transform({
            width,
            height,
            fit: 'cover',
            gravity: 'center'
          })
          .output({ format: 'image/webp', quality });

        const buffer = await output.response().arrayBuffer();
        return Buffer.from(buffer);
      },
      catch: (cause) => ImageProcessingError.make({ operation: 'resizeImage', cause })
    }).pipe(Effect.annotateLogs({ category: 'image', operation: 'resizeImage' }))
});

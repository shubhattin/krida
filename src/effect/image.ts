import { Context, Effect, Layer } from 'effect';
import type { WebpOptions } from 'sharp';
import sharp from 'sharp';
import { ImageProcessingError } from './errors';

export class ImageProcessor extends Context.Service<
  ImageProcessor,
  {
    readonly resizeImage: (
      inputPng: Buffer | string,
      width: number,
      height: number,
      webp_options?: WebpOptions
    ) => Effect.Effect<Buffer, ImageProcessingError>;
  }
>()('ImageProcessor') {
  static readonly Live = Layer.succeed(ImageProcessor)({
    resizeImage: (inputPng, width, height, webp_options) =>
      Effect.tryPromise({
        try: async () => {
          const inputPngBuffer = Buffer.isBuffer(inputPng)
            ? inputPng
            : Buffer.from(inputPng, 'base64');

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
              quality: 80,
              effort: 5,
              alphaQuality: 80,
              lossless: false,
              nearLossless: false,
              smartSubsample: true,
              ...webp_options
            })
            .toBuffer();
        },
        catch: (cause) => ImageProcessingError.make({ operation: 'resizeImage', cause })
      }).pipe(Effect.annotateLogs({ category: 'image', operation: 'resizeImage' }))
  });
}

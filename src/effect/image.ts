import { Context, Effect } from 'effect';
import { ImageProcessingError } from './errors';

/**
 * WebP encode options shared by Sharp and Cloudflare Images lives.
 * Sharp honours every field. Cloudflare Images maps `quality` / `lossless`
 * and ignores encoder-only knobs (`effort`, `alphaQuality`, `smartSubsample`).
 */
export type ResizeWebpOptions = {
  readonly quality?: number;
  readonly effort?: number;
  readonly alphaQuality?: number;
  readonly lossless?: boolean;
  readonly nearLossless?: boolean;
  readonly smartSubsample?: boolean;
};

export const toImageBytes = (input: Buffer | Uint8Array | string): Uint8Array => {
  if (input instanceof Uint8Array) {
    return input;
  }
  return Buffer.from(input, 'base64');
};

export const toImageStream = (input: Buffer | Uint8Array | string): ReadableStream<Uint8Array> => {
  const bytes = toImageBytes(input);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
};

export class ImageProcessor extends Context.Service<
  ImageProcessor,
  {
    readonly resizeImage: (
      inputPng: Buffer | Uint8Array | string,
      width: number,
      height: number,
      webp_options?: ResizeWebpOptions
    ) => Effect.Effect<Buffer, ImageProcessingError>;
  }
>()('ImageProcessor') {}

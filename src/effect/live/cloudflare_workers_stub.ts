/** Vitest-only stand-in for `cloudflare:workers` (see vitest.config.ts alias). */
export function waitUntil(promise: Promise<unknown>): void {
  void promise;
}

export const env = {
  IMAGES: {
    input: (_stream: ReadableStream<Uint8Array>) => {
      throw new Error(
        'env.IMAGES is not available in Node tests; provide ImageProcessorLive from sharp_images.ts'
      );
    }
  }
};

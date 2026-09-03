/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BETTER_AUTH_URL: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
  readonly VITE_ONESIGNAL_APP_ID: string;
  readonly VITE_ONESIGNAL_SAFARI_WEB_ID: string;
  readonly VITE_SITE_URL: string;
  readonly VITE_AWS_CLOUDFRONT_URL: string;
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_POSTHOG_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Minimal Images binding surface used by `src/effect/live/cf_images.ts`.
 * Full Worker runtime types are not included in this React tsconfig because
 * they replace DOM `Element` and break client components.
 */
interface ImagesBinding {
  input(stream: ReadableStream<Uint8Array>): ImageTransformer;
}

interface ImageTransformer {
  transform(transform: {
    width?: number;
    height?: number;
    fit?: 'scale-down' | 'contain' | 'pad' | 'squeeze' | 'cover' | 'crop';
    gravity?: 'face' | 'left' | 'right' | 'top' | 'bottom' | 'center' | 'auto' | 'entropy';
  }): ImageTransformer;
  output(options: {
    format: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/avif';
    quality?: number;
  }): Promise<ImageTransformationResult>;
}

interface ImageTransformationResult {
  response(options?: { headers?: HeadersInit }): Response;
  contentType(): string;
  image(): ReadableStream<Uint8Array>;
}

declare module 'cloudflare:workers' {
  export function waitUntil(promise: Promise<unknown>): void;
  export const env: Cloudflare.Env;
}

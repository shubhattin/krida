/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BETTER_AUTH_URL: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
  readonly VITE_SITE_URL: string;
  readonly VITE_AWS_CLOUDFRONT_URL: string;
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_POSTHOG_URL: string;
  /** Public Google OAuth client id (same as tsc-users PUBLIC_GOOGLE_CLIENT_ID). Enables One Tap. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

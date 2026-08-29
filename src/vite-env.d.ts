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

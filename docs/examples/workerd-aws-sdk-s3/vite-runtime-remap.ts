/**
 * Vite plugin + SSR optimizeDeps for AWS SDK in the Cloudflare workerd runner.
 * S3Client.js imports `./runtimeConfig` (Node). Point that at the fetch-based
 * browser build. Exclude the package from SSR prebundle or esbuild inlines
 * Node runtimeConfig and this remap never runs.
 */
import path from 'node:path';

const s3BrowserRuntimeConfig = path.join(
  import.meta.dirname,
  'node_modules/@aws-sdk/client-s3/dist-es/runtimeConfig.browser.js'
);

export const awsS3WorkersRuntime = {
  name: 'aws-s3-workers-runtime',
  enforce: 'pre' as const,
  resolveId(id: string, importer?: string) {
    if (
      (id === './runtimeConfig' || id === './runtimeConfig.js') &&
      importer?.replaceAll('\\', '/').includes('@aws-sdk/client-s3/dist-es/')
    ) {
      return s3BrowserRuntimeConfig;
    }
    return undefined;
  }
};

export const awsS3WorkersViteSsr = {
  optimizeDeps: {
    exclude: ['@aws-sdk/client-s3']
  }
};

/*
  vite.config.ts:

  plugins: [awsS3WorkersRuntime, cloudflare({ viteEnvironment: { name: 'ssr' } }), …]
  ssr: { optimizeDeps: { exclude: ['@aws-sdk/client-s3'] } }

  Construct S3Client on first upload/delete, not when the Effect Layer is built.
  SSR loaders that only need DB/Redis must not import the Node runtimeConfig.
*/

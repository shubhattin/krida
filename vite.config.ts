import path from 'node:path';
import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
// Nitro is unused while the app runs in workerd (local + Cloudflare). Keep the
// package installed for now; do not re-enable this plugin in the Worker graph.
// import { nitro } from 'nitro/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const s3BrowserRuntimeConfig = path.join(
  import.meta.dirname,
  'node_modules/@aws-sdk/client-s3/dist-es/runtimeConfig.browser.js'
);

/** S3Client imports `./runtimeConfig` (Node). Point that at the fetch-based browser build. */
const awsS3WorkersRuntime = {
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

const config = defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  // Pre-bundle these on first startup so Vite does not discover them mid-session
  // and full-reload the client (that race shows up as MatchInnerImpl hydration errors).
  optimizeDeps: {
    include: ['buffer', 'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']
  },
  // Do not pre-bundle the Node AWS runtime into SSR; that skips the remap above.
  ssr: {
    optimizeDeps: {
      exclude: ['@aws-sdk/client-s3']
    }
  },
  plugins: [
    awsS3WorkersRuntime,
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    // nitro(),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler']
      }
    }),
    // After Start + React so console piping cannot sit between the Cloudflare
    // worker environment and the TanStack plugin.
    // injectSource stamps data-tsd-source with different line numbers on SSR vs
    // client (workerd vs browser transforms), which React reports as a hydration mismatch.
    ...devtools({
      injectSource: { enabled: false }
    })
  ]
});

export default config;

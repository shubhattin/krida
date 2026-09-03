import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
// Nitro is unused while the app runs in workerd (local + Cloudflare). Keep the
// package installed for now; do not re-enable this plugin in the Worker graph.
// import { nitro } from 'nitro/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const config = defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    devtools(),
    tailwindcss(),
    tanstackStart(),
    // nitro(),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler']
      }
    })
  ]
});

export default config;

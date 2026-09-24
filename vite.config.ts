import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const config = defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    // Vite 8.2 + Nitro splits the SSR service into a chunk that re-exports
    // an undeclared `ssr_exports`, which 500s every request.
    // https://github.com/TanStack/router/issues/8031
    nitro({ inlineDynamicImports: true }),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler']
      }
    })
  ]
});

export default config;

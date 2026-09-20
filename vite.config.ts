import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { seoStaticFilesPlugin } from './src/vite-plugin/seo_static_files';

const config = defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler']
      }
    }),
    // After nitro so closeBundle(order: 'post') writes into .output/public last.
    seoStaticFilesPlugin({ siteUrl: process.env.VITE_SITE_URL })
  ]
});

export default config;

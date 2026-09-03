import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(root, 'src');

export default defineConfig({
  resolve: {
    alias: [
      { find: /^~\//, replacement: `${src}/` },
      { find: /^@\//, replacement: `${src}/` },
      {
        find: 'cloudflare:workers',
        replacement: path.resolve(src, 'effect/live/cloudflare_workers_stub.ts')
      }
    ]
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/effect/test_setup.ts'],
    globals: false,
    pool: 'forks',
    fileParallelism: false,
    teardownTimeout: 2000,
    hookTimeout: 5000
  }
});

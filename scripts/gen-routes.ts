// Regenerates src/routeTree.gen.ts for the worktree in the current directory.
// Usage (from a worktree root): bun ../gen-routes.ts
import { Generator, getConfig } from '@tanstack/router-generator';

const root = process.cwd();
const config = getConfig(
  {
    target: 'react',
    routesDirectory: './src/routes',
    generatedRouteTree: './src/routeTree.gen.ts',
    routeTreeFileFooter: [
      [
        "import type { getRouter } from './router.tsx'",
        "import type { createStart } from '@tanstack/react-start'",
        "declare module '@tanstack/react-start' {",
        '  interface Register {',
        '    ssr: true',
        '    router: Awaited<ReturnType<typeof getRouter>>',
        '  }',
        '}'
      ].join('\n')
    ]
  },
  root
);

await new Generator({ config, root }).run();
console.log('routeTree.gen.ts regenerated');

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['react-icons'],
    turbopackRustReactCompiler: true
  },
  reactCompiler: true,
  typedRoutes: true,
  // sharp@0.35 loads libvips from sibling @img/* packages via dlopen; ensure
  // those native binaries are included in Vercel serverless function traces.
  outputFileTracingIncludes: {
    '/api/trpc/*': ['./node_modules/sharp/**/*', './node_modules/@img/**/*'],
    '/*': ['./node_modules/sharp/**/*', './node_modules/@img/**/*']
  }
};

export default nextConfig;

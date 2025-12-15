import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['react-icons']
  },
  reactCompiler: true,
  typedRoutes: true
};

export default nextConfig;

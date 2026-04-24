import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: process.env.RAILWAY_DEPLOYMENT_ID ?? process.env.VERCEL_DEPLOYMENT_ID ?? 'dev',
  },
  outputFileTracingIncludes: {
    '/api/generate': ['./templates/**/*'],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: process.env.RAILWAY_DEPLOYMENT_ID ?? process.env.VERCEL_DEPLOYMENT_ID ?? 'dev',
  },
  outputFileTracingIncludes: {
    '/api/generate': ['./templates/**/*'],
  },
  experimental: {
    staleTimes: {
      static: 0,   // 禁用 client router cache，確保每次導回主頁都重新取資料
      dynamic: 0,
    },
  },
};

export default nextConfig;

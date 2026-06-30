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
      static: 30,   // 確保每次導回主頁都重新取資料 (Next.js 15+ 規定 static 最小值為 30)
      dynamic: 0,
    },
  },
};

export default nextConfig;

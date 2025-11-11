import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone', // 启用 standalone 输出模式，用于 Docker 部署
  experimental: {
    turbo: {
    },
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  serverExternalPackages: ['tesseract.js', 'bullmq', 'redis', 'minio'],
};

export default nextConfig;

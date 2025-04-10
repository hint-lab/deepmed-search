import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
    },
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  serverExternalPackages: ['tesseract.js', 'zerox'],
};

export default nextConfig;

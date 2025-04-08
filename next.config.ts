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
};

export default nextConfig;

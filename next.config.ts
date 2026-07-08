import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.bunnycdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.stream.bunnycdn.com',
      },
    ],
  },
};

export default nextConfig;

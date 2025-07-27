import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable caching in development
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      staleTimes: {
        dynamic: 0,
        static: 0,
      },
    },
    onDemandEntries: {
      maxInactiveAge: 0,
      pagesBufferLength: 0,
    },
  }),
};

export default nextConfig;

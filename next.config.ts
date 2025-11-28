import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for API routes
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },

  // No need for external images config anymore - everything is local
};

export default nextConfig;

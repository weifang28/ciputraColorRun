import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for API routes
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },

  // Allow images from cloudinary
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

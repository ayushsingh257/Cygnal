import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",         // Requests to /api/* on Next.js
        destination: "http://localhost:5000/api/:path*", // Forward to Flask
      },
    ];
  },
};

export default nextConfig;

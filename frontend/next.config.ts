import type { NextConfig } from "next";

const apiBaseUrl =
  process.env.CYGNAL_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

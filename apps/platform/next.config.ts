import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@yunwu/auth", "@yunwu/platform-core", "@yunwu/ui", "@yunwu/shared"],
  serverExternalPackages: ["@prisma/client"],
  // Security headers for admin tool
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },

  // Relax type checking for workspace packages
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

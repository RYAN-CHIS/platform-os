import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma as server external (runtime require, not bundled at build)
  transpilePackages: ["@yunwu/auth", "@yunwu/platform", "@yunwu/ui", "@yunwu/shared"],
  transpilePackages: ["@yunwu/auth", "@yunwu/platform", "@yunwu/ui", "@yunwu/shared"],
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",

  /** Turbopack is the default bundler in Next.js 16 */
  turbopack: {},
};

export default nextConfig;

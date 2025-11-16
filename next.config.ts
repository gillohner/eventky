import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["pubky-app-specs"],

  turbopack: {
    // Tell Turbopack the monorepo root is one level up
    root: join(__dirname, ".."),
  },
};

export default nextConfig;

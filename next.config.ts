import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["pubky-app-specs"],

  // Configure allowed image hostnames
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/static/files/**',
      },
      {
        protocol: 'https',
        hostname: 'nexus.staging.pubky.app',
        pathname: '/static/files/**',
      },
      {
        protocol: 'https',
        hostname: 'nexus.pubky.app',
        pathname: '/static/files/**',
      },
    ],
  },

  turbopack: {
    // Tell Turbopack the monorepo root is one level up
    root: join(__dirname, ".."),
  },

  // Experimental features for WASM
  experimental: {
    // Enable WebAssembly support
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Webpack config for production builds (Turbopack only used in dev)
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Don't load WASM on server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@synonymdev/pubky': 'commonjs @synonymdev/pubky'
      });
    }

    return config;
  },
};

export default nextConfig;

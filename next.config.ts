import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@eventky/pubky-app-specs"],

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

  // Empty turbopack config — Next.js 16 uses Turbopack by default
  turbopack: {},

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

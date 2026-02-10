import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // Exclude pg and sequelize from bundling - let Node.js resolve them at runtime
  serverExternalPackages: ['pg', 'pg-hstore', 'sequelize'],
  // Ensure pg and sequelize files are included in Vercel serverless function output
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/pg/**/*', './node_modules/pg-pool/**/*', './node_modules/pg-protocol/**/*', './node_modules/pg-types/**/*', './node_modules/pgpass/**/*', './node_modules/pg-connection-string/**/*', './node_modules/pg-hstore/**/*', './node_modules/sequelize/**/*'],
  },
};

export default nextConfig;

const NextFederationPlugin = require('@module-federation/nextjs-mf');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'shell',
        filename: 'static/chunks/remoteEntry.js',
        remotes: {
          customer: `customer@http://localhost:3001/_next/static/chunks/remoteEntry.js`,
          salesActivity: `salesActivity@http://localhost:3002/_next/static/chunks/remoteEntry.js`,
          opportunity: `opportunity@http://localhost:3003/_next/static/chunks/remoteEntry.js`,
          analytics: `analytics@http://localhost:3004/_next/static/chunks/remoteEntry.js`,
        },
        shared: {
          react: { singleton: true, requiredVersion: '^18.3.1' },
          'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
        },
        extraOptions: {
          automaticAsyncBoundary: true,
        },
      })
    );

    return config;
  },
};

module.exports = nextConfig;

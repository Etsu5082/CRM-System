const NextFederationPlugin = require('@module-federation/nextjs-mf');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'opportunity',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './OpportunityList': './src/components/OpportunityList',
          './ApprovalList': './src/components/ApprovalList',
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

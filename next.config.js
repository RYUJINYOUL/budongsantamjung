const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [],
    experimental: {
        serverComponentsExternalPackages: ['undici'],
    },
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.alias = {
                ...config.resolve.alias,
                undici: false,
                '@firebase/auth': path.resolve(__dirname, 'node_modules/@firebase/auth/dist/esm2017/index.js'),
                '@firebase/app': path.resolve(__dirname, 'node_modules/@firebase/app/dist/esm/index.esm2017.js'),
            };
        }
        return config;
    },
};

module.exports = nextConfig;

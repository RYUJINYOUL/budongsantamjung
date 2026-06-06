const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [],
    experimental: {
        serverComponentsExternalPackages: ['firebase', '@firebase/auth', '@firebase/storage'],
    },
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            undici: false,
            '@firebase/auth': path.resolve(__dirname, 'node_modules/@firebase/auth/dist/esm2017/index.js'),
            '@firebase/app': path.resolve(__dirname, 'node_modules/@firebase/app/dist/esm/index.esm2017.js'),
            '@firebase/storage': path.resolve(__dirname, 'node_modules/@firebase/storage/dist/index.esm2017.js'),
        };
        return config;
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40'}/api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;

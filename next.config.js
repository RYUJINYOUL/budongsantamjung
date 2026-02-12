/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['undici', 'firebase'],
    experimental: {
        serverComponentsExternalPackages: ['undici'],
    },
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                undici: false,
            };
        }
        return config;
    },
};

module.exports = nextConfig;

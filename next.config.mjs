/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit + sweph are native/node-only packages; keep them external
  // so Next doesn't try to bundle them for client builds.
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "sweph"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // These should never end up in client bundles.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;

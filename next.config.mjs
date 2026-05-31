/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdfkit + sweph are native/node-only; keep them external so Next doesn't
    // try to bundle them for client and they can read their own asset files.
    serverComponentsExternalPackages: ["pdfkit", "sweph"],

    // Ensure font + ephe assets end up in the Vercel deployment bundle.
    // outputFileTracingIncludes is the Next.js 14 experimental API for this.
    outputFileTracingIncludes: {
      "/api/backoffice/release": [
        "./public/fonts/**/*",
        "./src/lib/pdf/fonts/**/*",
        "./ephe/**/*",
      ],
      "/api/backoffice/preview": [
        "./public/fonts/**/*",
        "./src/lib/pdf/fonts/**/*",
      ],
      "/api/process": [
        "./ephe/**/*",
      ],
    },
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
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

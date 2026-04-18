/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit + sweph are native/node-only; keep them external so Next doesn't
  // try to bundle them for client and they can read their own asset files.
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "sweph"],
  },

  // Ensure our font + ephe assets end up in the Vercel deployment bundle.
  // Without this, Vercel tree-shakes files outside `app/` and PDF/chart
  // generation fails at runtime with "ENOENT" on the missing TTF or .se1.
  outputFileTracingIncludes: {
    "/api/backoffice/release": [
      "./src/lib/pdf/fonts/**/*",
      "./ephe/**/*",
    ],
    "/api/backoffice/preview": [
      "./src/lib/pdf/fonts/**/*",
    ],
    "/api/process": [
      "./ephe/**/*",
    ],
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

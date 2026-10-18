import type { NextConfig } from "next";

const CATEGORY_IDS = [
  "pdf-tools",
  "image-tools",
  "text-tools",
  "social-tools",
  "developer-tools",
];

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  // PDF Split's server fallback (app/api/pdf/split/*) loads these at runtime.
  // @napi-rs/canvas ships a native binary and pdfjs-dist / the qpdf WASM glue
  // are CommonJS: keep them out of the webpack server bundle.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "@neslinesli93/qpdf-wasm", "jspdf"],
  // Files that are loaded by path (not by import) are invisible to Vercel's
  // file tracer, so include them explicitly or the function can't find them.
  outputFileTracingIncludes: {
    "/api/pdf/split/process": [
      "./node_modules/@neslinesli93/qpdf-wasm/dist/**/*",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/pdfjs-dist/legacy/build/**/*",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    // 301 redirects: old /tools/[category-id] → /tool-category/[category-id]
    // Preserves SEO link equity while resolving the dynamic route conflict.
    return CATEGORY_IDS.map((id) => ({
      source: `/tools/${id}`,
      destination: `/tool-category/${id}`,
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Required for pdfjs-dist canvas worker
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    if (!isServer) {
      // The qpdf WebAssembly glue (Emscripten) also contains Node-only code paths
      // that require fs / path / crypto. They are never executed in the browser;
      // an empty module lets the client bundle compile.
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false };
    }
    return config;
  },
};

export default nextConfig;
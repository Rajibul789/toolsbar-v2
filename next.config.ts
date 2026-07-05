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
  // @napi-rs/canvas ships platform-specific native .node binary files
  // (compiled Rust/Skia bindings, one per OS/arch). Webpack's default loader
  // can only parse JavaScript/TypeScript, so trying to bundle a .node file
  // fails with "Module parse failed: Unexpected character". This tells
  // Next.js to leave @napi-rs/canvas out of the Server Components/Route
  // Handlers bundle entirely and load it via native Node.js require() at
  // runtime instead — which is exactly how a native addon must be loaded.
  // pdfjs-dist is included defensively too, since our route also loads its
  // Node-targeted build (via createRequire, which is itself already
  // webpack-invisible — this entry is belt-and-suspenders, not strictly
  // required, but costs nothing and guards against future changes).
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
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
  webpack: (config) => {
    // Required for pdfjs-dist canvas worker
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
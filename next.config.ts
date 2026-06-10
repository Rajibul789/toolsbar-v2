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
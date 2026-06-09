export const SITE_CONFIG = {
  name: "ToolsBar",
  tagline: "Free Online Tools — Engineered for Precision",
  description:
    "15+ free, privacy-first online tools for PDF, images, documents, and developers. All processing happens in your browser — no uploads, no signups.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolsbar.com",
  ogImage: "/images/og-image.jpg",

  social: {
    twitter: "https://twitter.com/toolsbar",
    github:  "https://github.com/toolsbar",
  },

  contact: {
    email:       "hello@toolsbar.com",
    formspreeId: process.env.NEXT_PUBLIC_FORMSPREE_ID ?? "",
  },

  // AdSense
  adsense: {
    publisherId: process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "",
    slots: {
      HOME_BELOW_HERO: process.env.NEXT_PUBLIC_AD_SLOT_HOME_HERO    ?? "",
      HOME_MID:        process.env.NEXT_PUBLIC_AD_SLOT_HOME_MID     ?? "",
      TOOL_BELOW:      process.env.NEXT_PUBLIC_AD_SLOT_TOOL_BELOW   ?? "",
      BLOG_SIDEBAR:    process.env.NEXT_PUBLIC_AD_SLOT_BLOG_SIDEBAR ?? "",
      BLOG_IN_CONTENT: process.env.NEXT_PUBLIC_AD_SLOT_BLOG_CONTENT ?? "",
    },
  },

  // External services
  // NOTE: PDF Split is now handled by the integrated Next.js API route
  // at /api/pdf/split — no external backend needed.
  services: {
    urlShortener: process.env.URL_SHORTENER_WORKER_URL ?? "https://url.kazirajibulislam567567.workers.dev",
  },

  features: {
    favorites:       true,
    downloadHistory: true,
    recentTools:     true,
    darkMode:        true,
  },
} as const;

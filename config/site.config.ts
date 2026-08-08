/**
 * Resolves the site's real, currently-deployed URL.
 *
 * The previous hardcoded fallback ("https://toolsbar.com") pointed at a
 * domain the project isn't actually deployed to — the real deployment is
 * on a *.vercel.app URL. Every relative asset path in metadata (og:image,
 * etc.) gets resolved against this value, so a wrong base here silently
 * breaks link previews on every page, not just the ones referencing it
 * directly — confirmed via a real WhatsApp share showing no image.
 *
 * Priority: an explicit NEXT_PUBLIC_SITE_URL always wins (set this once a
 * real custom domain exists) → Vercel's own automatically-provided
 * production URL → Vercel's per-deployment URL (covers preview
 * deployments too) → hardcoded fallback, only reached outside Vercel.
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://toolsbar.com";
}

export const SITE_CONFIG = {
  name: "ToolsBar",
  tagline: "Free Online Tools — Engineered for Precision",
  description:
    "15+ free, privacy-first online tools for PDF, images, documents, and developers. All processing happens in your browser — no uploads, no signups.",
  url: resolveSiteUrl(),
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

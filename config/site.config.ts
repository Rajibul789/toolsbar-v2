/**
 * Resolves the site's canonical public origin (scheme + host, no trailing
 * slash). This is the single source of truth for every absolute URL the
 * site emits: metadataBase, canonical/OG URLs, JSON-LD structured data,
 * robots.txt, and the sitemap generator (next-sitemap.config.js mirrors
 * this exact priority order — keep the two in sync).
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL — explicit, always wins. Set this once a real
 *      custom domain exists, and on any host that is not Vercel.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — provided automatically by Vercel.
 *   3. VERCEL_URL — per-deployment URL (preview deployments).
 *   4. Local development (NODE_ENV !== "production") — http://localhost:PORT.
 *   5. Last resort for a production build with nothing configured:
 *      https://toolsbar.com, with a loud one-time warning, because every
 *      canonical URL and structured-data URL would otherwise silently point
 *      at a domain the deployment may not own.
 *
 * Every candidate is validated: it must parse as an absolute http(s) URL.
 * An invalid NEXT_PUBLIC_SITE_URL is reported and skipped (never used as-is),
 * and only the origin is kept — a pasted path or trailing slash is dropped.
 * This module is only used from Server Components / route handlers: the
 * VERCEL_* variables are not exposed to browser bundles.
 */
const LAST_RESORT_SITE_URL = "https://toolsbar.com";

function toOrigin(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function warnOnce(key: string, message: string): void {
  const g = globalThis as unknown as Record<string, boolean | undefined>;
  if (g[key]) return;
  g[key] = true;
  console.warn(`[site.config] ${message}`);
}

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const fromEnv = toOrigin(explicit);
  if (fromEnv) return fromEnv;
  if (explicit?.trim()) {
    warnOnce(
      "__siteUrlInvalidWarned",
      `NEXT_PUBLIC_SITE_URL ("${explicit}") is not a valid absolute http(s) URL and was ignored. ` +
        `Use e.g. https://example.com (no path).`
    );
  }

  const vercelProd = toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProd) return vercelProd;
  const vercelDeploy = toOrigin(process.env.VERCEL_URL);
  if (vercelDeploy) return vercelDeploy;

  if (process.env.NODE_ENV !== "production") {
    return `http://localhost:${process.env.PORT || 3000}`;
  }

  warnOnce(
    "__siteUrlFallbackWarned",
    `NEXT_PUBLIC_SITE_URL is not set and no Vercel URL was detected — falling back to ` +
      `${LAST_RESORT_SITE_URL}. Set NEXT_PUBLIC_SITE_URL to this deployment's real domain so ` +
      `canonical URLs, Open Graph URLs, structured data and the sitemap are correct.`
  );
  return LAST_RESORT_SITE_URL;
}

/** Builds an absolute URL on the configured site origin. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_CONFIG.url}${path.startsWith("/") ? path : `/${path}`}`;
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
  // NOTE: PDF Split runs entirely in the browser — there is no server route
  // for it (Vercel caps request bodies at ~4.5 MB, so large PDFs can't be
  // uploaded to a function anyway).
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
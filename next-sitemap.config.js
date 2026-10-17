/** @type {import('next-sitemap').IConfig} */

/**
 * Path-level priority and changefreq overrides.
 *
 * Why no require('./config/tools.config') here:
 *   next-sitemap runs in plain Node.js (CommonJS) after `next build`.
 *   tools.config is a TypeScript ES-module file — require() cannot resolve
 *   .ts extensions or consume ES module exports. The fix is to rely on
 *   next-sitemap's native route auto-discovery: all tool pages are statically
 *   pre-rendered via generateStaticParams and appear in the .next build
 *   manifest automatically. The transform() function below applies the same
 *   priority/changefreq values that were previously set in additionalPaths.
 */
const PATH_CONFIG = {
  "/":               { priority: 1.0,  changefreq: "daily"   },
  "/tools":          { priority: 0.95, changefreq: "weekly"  },
  "/blog":           { priority: 0.85, changefreq: "weekly"  },
  "/about":          { priority: 0.6,  changefreq: "monthly" },
  "/contact":        { priority: 0.6,  changefreq: "monthly" },
  "/privacy-policy": { priority: 0.4,  changefreq: "yearly"  },
  "/terms":          { priority: 0.4,  changefreq: "yearly"  },
  "/disclaimer":     { priority: 0.4,  changefreq: "yearly"  },
  "/cookie-policy":  { priority: 0.4,  changefreq: "yearly"  },
};

/**
 * Site origin — MUST mirror resolveSiteUrl() in config/site.config.ts
 * (same priority order and validation). It is duplicated here only because
 * this file runs as plain CommonJS after `next build` and cannot import the
 * TypeScript config.
 *   1. NEXT_PUBLIC_SITE_URL  2. VERCEL_PROJECT_PRODUCTION_URL
 *   3. VERCEL_URL            4. last resort https://toolsbar.com
 * (The localhost dev fallback in site.config.ts is irrelevant here: this file only
 * runs after a production build.)
 */
function toOrigin(raw) {
  const value = raw && raw.trim();
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function resolveSiteUrl() {
  const resolved =
    toOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    toOrigin(process.env.VERCEL_URL);
  if (resolved) return resolved;
  console.warn(
    "[next-sitemap] NEXT_PUBLIC_SITE_URL is not set and no Vercel URL was detected — " +
      "sitemap URLs fall back to https://toolsbar.com. Set NEXT_PUBLIC_SITE_URL to this deployment's real domain."
  );
  return "https://toolsbar.com";
}

module.exports = {
  siteUrl: resolveSiteUrl(),
  generateRobotsTxt: false, // served by app/robots.ts (uses the configured site URL)
  generateIndexSitemap: true,
  changefreq: "weekly",
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ["/admin", "/admin/*", "/api/*"],

  /**
   * transform() is called for every route discovered in the .next build output.
   * This replaces the old additionalPaths() approach which required importing
   * the TypeScript tools.config — incompatible with CommonJS next-sitemap runtime.
   */
  transform: async (config, path) => {
    // Tool detail pages  e.g. /tools/pdf-split
    if (/^\/tools\/[^/]+$/.test(path)) {
      return {
        loc: path,
        priority: 0.9,
        changefreq: "monthly",
        lastmod: new Date().toISOString(),
      };
    }

    // Tool category pages  e.g. /tool-category/pdf-tools
    if (/^\/tool-category\/[^/]+$/.test(path)) {
      return {
        loc: path,
        priority: 0.8,
        changefreq: "weekly",
        lastmod: new Date().toISOString(),
      };
    }

    // Blog post pages  e.g. /blog/how-to-split-pdf
    if (/^\/blog\/[^/]+$/.test(path) && !path.startsWith("/blog/category/") && !path.startsWith("/blog/author/") && !path.startsWith("/blog/tag/")) {
      return {
        loc: path,
        priority: 0.75,
        changefreq: "monthly",
        lastmod: new Date().toISOString(),
      };
    }

    // Named path overrides (homepage, /tools listing, /blog listing, legal pages)
    if (PATH_CONFIG[path]) {
      return {
        loc: path,
        priority: PATH_CONFIG[path].priority,
        changefreq: PATH_CONFIG[path].changefreq,
        lastmod: new Date().toISOString(),
      };
    }

    // Default — all remaining discovered pages
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: new Date().toISOString(),
    };
  },
};
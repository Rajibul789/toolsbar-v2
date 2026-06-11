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

module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://toolsbar.com",
  generateRobotsTxt: false, // managed manually
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
import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site.config";

/**
 * robots.txt — generated so the Sitemap directive always points at the
 * site's configured origin (config/site.config.ts). It replaces a static
 * public/robots.txt that hardcoded https://toolsbar.com.
 *
 * The sitemap itself (/sitemap.xml) is produced after each build by
 * next-sitemap (see next-sitemap.config.js).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/auth/", "/api/admin/"],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  };
}
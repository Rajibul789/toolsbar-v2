/**
 * lib/data/seo.ts
 *
 * Server-side global SEO settings fetching with Next.js `unstable_cache`.
 * Invalidated by `revalidateTag(CACHE_TAGS.seoSettings)` in
 * app/api/admin/seo/route.ts on every save.
 *
 * Every field defaults to exactly what app/layout.tsx and the homepage
 * hardcoded before this config existed, so a site where the admin has
 * never touched SEO Settings renders identically to today.
 */

import { unstable_cache } from "next/cache";
import prisma from "@/lib/db";
import { CACHE_TAGS } from "./tools";

export interface SeoSettings {
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
  ogSiteName: string;
  ogImageUrl: string;
  ogTwitterHandle: string;
  googleVerification: string;
  bingVerification: string;
  googleAnalyticsId: string;
  orgName: string;
  orgUrl: string;
  orgEmail: string;
}

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  siteTitle: "ToolsBar – Free Online PDF, Image & Developer Tools",
  siteDescription:
    "ToolsBar provides 15+ free, privacy-first online tools for PDF processing, image editing, text conversion, and developer utilities — all running 100% in your browser.",
  siteKeywords: "free online tools, pdf tools, image compressor, word to pdf",
  ogSiteName: "ToolsBar",
  ogImageUrl: "/images/og-image.jpg",
  ogTwitterHandle: "@toolsbar",
  googleVerification: "",
  bingVerification: "",
  googleAnalyticsId: "",
  orgName: "ToolsBar",
  orgUrl: "https://toolsbar.com",
  orgEmail: "hello@toolsbar.com",
};

export const getSeoSettings = unstable_cache(
  async (): Promise<SeoSettings> => {
    try {
      const rows = await prisma.seoSetting.findMany({
        where: {
          key: {
            in: [
              "site_title", "site_description", "site_keywords",
              "og_site_name", "og_image_url", "og_twitter_handle",
              "google_verification", "bing_verification", "google_analytics_id",
              "org_name", "org_url", "org_email",
            ],
          },
        },
      });
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;

      const or = (key: string, fallback: string) => (map[key]?.trim() ? map[key] : fallback);

      return {
        siteTitle:          or("site_title",          DEFAULT_SEO_SETTINGS.siteTitle),
        siteDescription:    or("site_description",     DEFAULT_SEO_SETTINGS.siteDescription),
        siteKeywords:       or("site_keywords",        DEFAULT_SEO_SETTINGS.siteKeywords),
        ogSiteName:         or("og_site_name",         DEFAULT_SEO_SETTINGS.ogSiteName),
        ogImageUrl:         or("og_image_url",         DEFAULT_SEO_SETTINGS.ogImageUrl),
        ogTwitterHandle:    or("og_twitter_handle",    DEFAULT_SEO_SETTINGS.ogTwitterHandle),
        googleVerification: or("google_verification",  DEFAULT_SEO_SETTINGS.googleVerification),
        bingVerification:   or("bing_verification",    DEFAULT_SEO_SETTINGS.bingVerification),
        googleAnalyticsId:  or("google_analytics_id",  DEFAULT_SEO_SETTINGS.googleAnalyticsId),
        orgName:            or("org_name",             DEFAULT_SEO_SETTINGS.orgName),
        orgUrl:             or("org_url",              DEFAULT_SEO_SETTINGS.orgUrl),
        orgEmail:           or("org_email",            DEFAULT_SEO_SETTINGS.orgEmail),
      };
    } catch {
      return DEFAULT_SEO_SETTINGS;
    }
  },
  ["seo-settings"],
  { tags: [CACHE_TAGS.seoSettings], revalidate: 60 }
);

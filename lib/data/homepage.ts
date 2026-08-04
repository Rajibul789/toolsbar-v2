/**
 * lib/data/homepage.ts
 *
 * Server-side homepage config fetching with Next.js `unstable_cache`.
 * Invalidated by `revalidateTag(CACHE_TAGS.homepage)` in
 * app/api/admin/homepage/route.ts on every save.
 *
 * Every field below defaults to exactly what the homepage rendered before
 * this config existed, so a site where the admin has never touched
 * Homepage Builder renders identically to today.
 */

import { unstable_cache } from "next/cache";
import prisma from "@/lib/db";
import { CACHE_TAGS } from "./tools";

export interface HomepageSettings {
  heroHeadline: string;
  typewriterLines: string[];
  showHero: boolean;
  showFeatured: boolean;
  showToolsGrid: boolean;
  showRecentlyUsed: boolean;
  showWhyUs: boolean;
  showFaq: boolean;
  showBlogPreview: boolean;
}

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettings = {
  heroHeadline: "FREE ONLINE TOOLS",
  typewriterLines: [
    "Split PDFs in seconds.",
    "Compress images instantly.",
    "Convert documents freely.",
    "All in your browser.",
    "No uploads. No limits.",
  ],
  showHero: true,
  showFeatured: true,
  showToolsGrid: true,
  showRecentlyUsed: true,
  showWhyUs: true,
  showFaq: true,
  showBlogPreview: true,
};

export const getHomepageConfig = unstable_cache(
  async (): Promise<HomepageSettings> => {
    try {
      const rows = await prisma.homepageConfig.findMany();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;

      const boolOr = (key: string, fallback: boolean) =>
        key in map ? map[key] === "true" : fallback;

      return {
        heroHeadline: map.hero_headline?.trim() || DEFAULT_HOMEPAGE_SETTINGS.heroHeadline,
        typewriterLines: map.hero_typewriter
          ? map.hero_typewriter.split("\n").map((l) => l.trim()).filter(Boolean)
          : DEFAULT_HOMEPAGE_SETTINGS.typewriterLines,
        showHero:         boolOr("show_hero",          DEFAULT_HOMEPAGE_SETTINGS.showHero),
        showFeatured:     boolOr("show_featured",       DEFAULT_HOMEPAGE_SETTINGS.showFeatured),
        showToolsGrid:    boolOr("show_tools_grid",     DEFAULT_HOMEPAGE_SETTINGS.showToolsGrid),
        showRecentlyUsed: boolOr("show_recently_used",  DEFAULT_HOMEPAGE_SETTINGS.showRecentlyUsed),
        showWhyUs:        boolOr("show_why_us",         DEFAULT_HOMEPAGE_SETTINGS.showWhyUs),
        showFaq:          boolOr("show_faq",            DEFAULT_HOMEPAGE_SETTINGS.showFaq),
        showBlogPreview:  boolOr("show_blog_preview",   DEFAULT_HOMEPAGE_SETTINGS.showBlogPreview),
      };
    } catch {
      return DEFAULT_HOMEPAGE_SETTINGS;
    }
  },
  ["homepage-config"],
  { tags: [CACHE_TAGS.homepage], revalidate: 60 }
);

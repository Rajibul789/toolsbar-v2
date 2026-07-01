/**
 * lib/data/tools.ts
 *
 * Server-side data fetching layer for tools, using Next.js `unstable_cache`
 * so data is cached per-request at the edge but can be invalidated on demand
 * when the admin makes changes via `revalidateTag("tools")`.
 *
 * Pattern:
 *   1. Try to read from DB (FeaturedSlide / Tool tables).
 *   2. Merge with static TOOLS_CONFIG for icon/color/description fields
 *      (these never change at runtime so the static config is authoritative).
 *   3. Fall back gracefully if the DB is unreachable (e.g. during build).
 */

import { unstable_cache } from "next/cache";
import prisma from "@/lib/db";
import { TOOLS_CONFIG, type ToolConfig } from "@/config/tools.config";

// ── Cache tags ────────────────────────────────────────────────────────────────
export const CACHE_TAGS = {
  tools:         "tools",
  featuredTools: "featured-tools",
  blogPosts:     "blog-posts",
  seoSettings:   "seo-settings",
  homepage:      "homepage-config",
} as const;

// ── Featured tools ────────────────────────────────────────────────────────────
/**
 * Returns the ordered list of featured tools for the homepage slider.
 * Source of truth: `FeaturedSlide` table (admin-managed).
 * Falls back to static config if DB is unavailable or has no active slides.
 */
export const getFeaturedTools = unstable_cache(
  async (): Promise<ToolConfig[]> => {
    try {
      const slides = await prisma.featuredSlide.findMany({
        where:   { isActive: true },
        orderBy: { order: "asc" },
        include: { tool: { select: { slug: true } } },
      });

      if (slides.length > 0) {
        const results: ToolConfig[] = [];
        for (const slide of slides) {
          const cfg = TOOLS_CONFIG.find((t) => t.slug === slide.tool.slug);
          if (cfg) results.push(cfg);
        }
        if (results.length > 0) return results;
      }
    } catch {
      // DB unreachable — fall through to static fallback
    }

    // Fallback: static config
    return TOOLS_CONFIG.filter((t) => t.isFeatured);
  },
  ["featured-tools"],
  { tags: [CACHE_TAGS.featuredTools, CACHE_TAGS.tools], revalidate: 60 }
);

// ── Tool visibility override ──────────────────────────────────────────────────
/**
 * Returns a map of slug → { isActive, isFeatured, isNew } from the DB.
 * Used by the admin tools page to show current DB state instead of static config.
 */
export const getToolStateMap = unstable_cache(
  async (): Promise<Record<string, { isActive: boolean; isFeatured: boolean; isNew: boolean }>> => {
    try {
      const tools = await prisma.tool.findMany({
        select: { slug: true, isActive: true, isFeatured: true, isNew: true },
      });
      return Object.fromEntries(
        tools.map((t: { slug: string; isActive: boolean; isFeatured: boolean; isNew: boolean }) => [
          t.slug,
          { isActive: t.isActive, isFeatured: t.isFeatured, isNew: t.isNew },
        ])
      );
    } catch {
      return {};
    }
  },
  ["tool-state-map"],
  { tags: [CACHE_TAGS.tools], revalidate: 30 }
);
/**
 * lib/data/settings.ts
 *
 * Server-side cached fetchers for global site settings.
 * Uses Next.js unstable_cache with short TTL + tag-based invalidation
 * so admin changes propagate within seconds without a full redeployment.
 */

import { unstable_cache } from "next/cache";
import prisma from "@/lib/db";

export const SETTINGS_CACHE_TAG = "settings";
export const MAINTENANCE_CACHE_TAG = "maintenance-mode";

// ── Maintenance mode ──────────────────────────────────────────────────────────
/**
 * Returns true when the admin has enabled maintenance mode.
 * Cached for 10 seconds — invalidated immediately by revalidateTag
 * when the admin toggles the setting via /api/admin/settings/maintenance.
 *
 * Fails OPEN: if the DB is unreachable, maintenance mode is treated as OFF
 * so the public site remains accessible.
 */
export const getMaintenanceMode = unstable_cache(
  async (): Promise<boolean> => {
    try {
      const row = await prisma.seoSetting.findUnique({
        where:  { key: "maintenance_mode" },
        select: { value: true },
      });
      return row?.value === "true";
    } catch {
      return false;
    }
  },
  ["maintenance-mode"],
  { tags: [SETTINGS_CACHE_TAG, MAINTENANCE_CACHE_TAG], revalidate: 10 }
);
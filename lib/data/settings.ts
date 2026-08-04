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
export const SESSION_DURATION_CACHE_TAG = "session-duration";

/** Allowed session durations, in milliseconds — matches the Settings page dropdown */
export const SESSION_DURATIONS_MS: Record<string, number> = {
  "12h": 12 * 60 * 60 * 1000,
  "1d":  24 * 60 * 60 * 1000,
  "7d":  7 * 24 * 60 * 60 * 1000,
};
export const DEFAULT_SESSION_DURATION_KEY = "7d";

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

// ── Session duration ──────────────────────────────────────────────────────────
/**
 * Returns how long a new admin session should stay active, in milliseconds.
 * Read by the login route when issuing a session. Defaults to 7 days
 * (the previous hardcoded value) if unset or the DB is unreachable.
 */
export const getSessionDurationMs = unstable_cache(
  async (): Promise<number> => {
    try {
      const row = await prisma.seoSetting.findUnique({
        where:  { key: "session_duration" },
        select: { value: true },
      });
      return (row?.value && SESSION_DURATIONS_MS[row.value]) || SESSION_DURATIONS_MS[DEFAULT_SESSION_DURATION_KEY];
    } catch {
      return SESSION_DURATIONS_MS[DEFAULT_SESSION_DURATION_KEY];
    }
  },
  ["session-duration"],
  { tags: [SETTINGS_CACHE_TAG, SESSION_DURATION_CACHE_TAG], revalidate: 30 }
);
/**
 * app/api/admin/settings/error-reveal/route.ts
 *
 * GET  /api/admin/settings/error-reveal
 *   Returns { enabled: boolean } — current state of the Error Reveal toggle.
 *   Public GET (no auth) — needed so error-context.tsx can read it
 *   from the client without requiring an admin session.
 *
 * PATCH /api/admin/settings/error-reveal
 *   Body: { enabled: boolean }
 *   Protected — admin session required.
 *   Persists the toggle to SeoSetting table (key: "error_reveal_enabled").
 *
 * Storage: SeoSetting table, key = "error_reveal_enabled", value = "true" | "false"
 * Default when row is absent: true (show real errors — safe default for new installs).
 */

import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { logApiError } from "@/lib/errors/logger";

const SETTING_KEY = "error_reveal_enabled";

// ── GET — public read ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const row = await prisma.seoSetting.findUnique({
      where:  { key: SETTING_KEY },
      select: { value: true },
    });

    // Default true when row doesn't exist yet
    const enabled = row ? row.value === "true" : true;
    return NextResponse.json({ enabled });

  } catch (err) {
    console.error("[api/settings/error-reveal GET]", err);
    await logApiError(err, { route: "/api/admin/settings/error-reveal" });
    // Fail open — return true so errors are visible if DB is unreachable
    return NextResponse.json({ enabled: true });
  }
}

// ── PATCH — admin-only write ──────────────────────────────────────────────────
const patchSchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies();
  const token       = cookieStore.get("admin_token")?.value;
  const admin       = await getAdminFromToken(token ?? "");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await prisma.seoSetting.upsert({
      where:  { key: SETTING_KEY },
      update: { value: String(parsed.data.enabled) },
      create: { key: SETTING_KEY, value: String(parsed.data.enabled) },
    });

    console.log(
      `[api/settings/error-reveal] Admin "${admin.email}" set error reveal → ${parsed.data.enabled}`
    );

    return NextResponse.json({ enabled: parsed.data.enabled });

  } catch (err) {
    console.error("[api/settings/error-reveal PATCH]", err);
    await logApiError(err, { route: "/api/admin/settings/error-reveal" });
    return NextResponse.json(
      { error: "Failed to save setting" },
      { status: 500 }
    );
  }
}
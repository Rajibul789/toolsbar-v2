import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { logApiError } from "@/lib/errors/logger";
import { SETTINGS_CACHE_TAG, MAINTENANCE_CACHE_TAG } from "@/lib/data/settings";

const KEY = "maintenance_mode";

export async function GET() {
  try {
    const row = await prisma.seoSetting.findUnique({ where: { key: KEY }, select: { value: true } });
    return NextResponse.json({ enabled: row?.value === "true" });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/settings/maintenance" });
    return NextResponse.json({ enabled: false });
  }
}

const schema = z.object({ enabled: z.boolean() });

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const admin = await getAdminFromToken(token ?? "");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await prisma.seoSetting.upsert({
      where:  { key: KEY },
      update: { value: String(parsed.data.enabled) },
      create: { key: KEY, value: String(parsed.data.enabled) },
    });

    // Immediately invalidate root layout maintenance cache
    revalidateTag(MAINTENANCE_CACHE_TAG);
    revalidateTag(SETTINGS_CACHE_TAG);

    console.log(`[maintenance] Admin "${admin.email}" set maintenance → ${parsed.data.enabled}`);
    return NextResponse.json({ enabled: parsed.data.enabled });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/settings/maintenance" });
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
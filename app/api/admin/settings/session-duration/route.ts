import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { logApiError } from "@/lib/errors/logger";
import {
  SETTINGS_CACHE_TAG, SESSION_DURATION_CACHE_TAG,
  SESSION_DURATIONS_MS, DEFAULT_SESSION_DURATION_KEY,
} from "@/lib/data/settings";

const KEY = "session_duration";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const admin = await getAdminFromToken(token ?? "");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const row = await prisma.seoSetting.findUnique({ where: { key: KEY }, select: { value: true } });
    const duration = row?.value && row.value in SESSION_DURATIONS_MS ? row.value : DEFAULT_SESSION_DURATION_KEY;
    return NextResponse.json({ duration });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/settings/session-duration" });
    return NextResponse.json({ duration: DEFAULT_SESSION_DURATION_KEY });
  }
}

const schema = z.object({ duration: z.enum(["12h", "1d", "7d"]) });

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
      update: { value: parsed.data.duration },
      create: { key: KEY, value: parsed.data.duration },
    });

    revalidateTag(SESSION_DURATION_CACHE_TAG);
    revalidateTag(SETTINGS_CACHE_TAG);

    // Note: this only affects sessions created from now on — it does not
    // shorten or extend sessions that already exist.
    return NextResponse.json({ duration: parsed.data.duration });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/settings/session-duration" });
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}

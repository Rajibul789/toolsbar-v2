/**
 * app/api/admin/seo/route.ts
 *
 * GET  — returns all SeoSetting rows
 * PATCH — upserts one or more SEO settings by key
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logApiError } from "@/lib/errors/logger";
import { CACHE_TAGS } from "@/lib/data/tools";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const admin = await getAdminFromToken(token ?? "");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await prisma.seoSetting.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json(settings);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/seo" });
    return NextResponse.json({ error: "Failed to fetch SEO settings" }, { status: 500 });
  }
}

const patchSchema = z.object({
  key:   z.string().min(1),
  value: z.string(),
});

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const admin = await getAdminFromToken(token ?? "");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const updates = Array.isArray(body) ? body : [body];

    // Validate everything up-front so a bad value is rejected with a 400 and
    // nothing is partially written.
    const items: Array<{ key: string; value: string }> = [];
    for (const item of updates) {
      const parsed = patchSchema.safeParse(item);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid SEO setting payload." }, { status: 400 });
      }
      // org_url feeds the Organization JSON-LD, so it must be blank (= use the
      // configured site URL) or a real absolute http(s) URL.
      if (parsed.data.key === "org_url" && parsed.data.value.trim() !== "" && !isHttpUrl(parsed.data.value)) {
        return NextResponse.json(
          { error: "Organization URL must be blank or a full http(s) URL, e.g. https://example.com" },
          { status: 400 }
        );
      }
      items.push(parsed.data);
    }

    const results = await Promise.all(
      items.map(({ key, value }) =>
        prisma.seoSetting.upsert({
          where:  { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    // Invalidate all pages that use SEO settings
    revalidateTag(CACHE_TAGS.seoSettings);
    revalidatePath("/", "layout");

    return NextResponse.json(results);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/seo" });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
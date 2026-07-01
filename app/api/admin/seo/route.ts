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

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const admin = await getAdminFromToken(token ?? "");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const updates = Array.isArray(body) ? body : [body];

    const results = await Promise.all(
      updates.map(async (item: unknown) => {
        const parsed = patchSchema.safeParse(item);
        if (!parsed.success) throw new Error(`Invalid item: ${JSON.stringify(item)}`);
        const { key, value } = parsed.data;
        return prisma.seoSetting.upsert({
          where:  { key },
          update: { value },
          create: { key, value },
        });
      })
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
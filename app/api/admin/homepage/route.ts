/**
 * app/api/admin/homepage/route.ts
 *
 * GET  — returns all HomepageConfig rows (section visibility, hero text, etc.)
 * PATCH — upserts one or more config keys
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
    const configs = await prisma.homepageConfig.findMany({ orderBy: { group: "asc" } });
    return NextResponse.json(configs);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/homepage" });
    return NextResponse.json({ error: "Failed to fetch homepage config" }, { status: 500 });
  }
}

// ConfigType values must match the Prisma enum exactly.
// z.enum() narrows the type to "TEXT"|"BOOLEAN"|"JSON"|"NUMBER" which is
// structurally identical to Prisma's generated ConfigType union — fixing the
// TS2322 "not assignable to 'ConfigType'" errors when passed to upsert().
const CONFIG_TYPES = ["TEXT", "BOOLEAN", "JSON", "NUMBER"] as const;

const patchSchema = z.object({
  key:   z.string().min(1),
  value: z.string(),
  label: z.string().optional(),
  type:  z.enum(CONFIG_TYPES).optional(),
  group: z.string().optional(),
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
        const { key, value, label, type, group } = parsed.data;
        return prisma.homepageConfig.upsert({
          where:  { key },
          update: { value, ...(label && { label }), ...(type && { type }), ...(group && { group }) },
          create: { key, value, label: label ?? key, type: type ?? "TEXT", group: group ?? "general" },
        });
      })
    );

    // Invalidate homepage so changes are visible immediately
    revalidateTag(CACHE_TAGS.homepage);
    revalidatePath("/");

    return NextResponse.json(results);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/homepage" });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
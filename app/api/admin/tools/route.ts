import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logApiError } from "@/lib/errors/logger";
import { CACHE_TAGS } from "@/lib/data/tools";

const CATEGORY_SLUGS = [
  "pdf-tools",
  "image-tools",
  "text-tools",
  "social-tools",
  "developer-tools",
];

const updateSchema = z.object({
  isActive:      z.boolean().optional(),
  isFeatured:    z.boolean().optional(),
  isNew:         z.boolean().optional(),
  order:         z.number().int().optional(),
  featuredOrder: z.number().int().optional(),
  seoTitle:      z.string().optional(),
  seoDesc:       z.string().optional(),
  seoKeywords:   z.string().optional(),
});

// GET all tools (admin view — includes inactive)
export async function GET() {
  try {
    const tools = await prisma.tool.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { category: true, featuredSlide: true },
    });
    return NextResponse.json(tools);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/tools" });
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
  }
}

// PATCH: update tool properties and sync public site cache
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    const admin = await getAdminFromToken(token ?? "");
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { slug, ...updates } = body as { slug: string } & Record<string, unknown>;

    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

    const parsed = updateSchema.safeParse(updates);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const tool = await prisma.tool.update({
      where: { slug },
      data: parsed.data,
    });

    // Sync FeaturedSlide table when isFeatured changes
    if (parsed.data.isFeatured === true) {
      await prisma.featuredSlide.upsert({
        where:  { toolId: tool.id },
        update: { isActive: true },
        create: {
          toolId:   tool.id,
          headline: tool.name.toUpperCase(),
          ctaText:  "Launch Tool",
          isActive: true,
          order:    parsed.data.featuredOrder ?? 0,
        },
      });
    } else if (parsed.data.isFeatured === false) {
      await prisma.featuredSlide.deleteMany({ where: { toolId: tool.id } }).catch(() => {});
    }

    // ── Cache invalidation ────────────────────────────────────────────────────
    // Invalidate all public pages that display tool data so admin changes
    // are immediately visible without a redeployment.
    revalidateTag(CACHE_TAGS.tools);
    revalidateTag(CACHE_TAGS.featuredTools);
    revalidatePath("/");                        // homepage (FeaturedToolsSlider)
    revalidatePath("/tools");                   // tools directory
    revalidatePath(`/tools/${slug}`);           // individual tool page
    CATEGORY_SLUGS.forEach((cat) =>
      revalidatePath(`/tool-category/${cat}`)   // all category pages
    );

    return NextResponse.json(tool);
  } catch (err) {
    console.error(err);
    await logApiError(err, { route: "/api/admin/tools" });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
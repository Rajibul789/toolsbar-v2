import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { cookies } from "next/headers";

const updateSchema = z.object({
  isActive:     z.boolean().optional(),
  isFeatured:   z.boolean().optional(),
  isNew:        z.boolean().optional(),
  order:        z.number().int().optional(),
  featuredOrder:z.number().int().optional(),
  seoTitle:     z.string().optional(),
  seoDesc:      z.string().optional(),
  seoKeywords:  z.string().optional(),
});

// GET all tools (admin view — includes inactive)
export async function GET() {
  try {
    const tools = await prisma.tool.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { category: true, featuredSlide: true },
    });
    return NextResponse.json(tools);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
  }
}

// PATCH: bulk update tool properties
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    const admin = await getAdminFromToken(token ?? "");
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { slug, ...updates } = body;

    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

    const parsed = updateSchema.safeParse(updates);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const tool = await prisma.tool.update({
      where: { slug },
      data: parsed.data,
    });

    // If featuring, create a FeaturedSlide record
    if (parsed.data.isFeatured === true) {
      await prisma.featuredSlide.upsert({
        where:  { toolId: tool.id },
        update: { isActive: true },
        create: {
          toolId:    tool.id,
          headline:  tool.name.toUpperCase(),
          ctaText:   "Launch Tool",
          isActive:  true,
          order:     parsed.data.featuredOrder ?? 0,
        },
      });
    } else if (parsed.data.isFeatured === false) {
      await prisma.featuredSlide.deleteMany({ where: { toolId: tool.id } }).catch(() => {});
    }

    return NextResponse.json(tool);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

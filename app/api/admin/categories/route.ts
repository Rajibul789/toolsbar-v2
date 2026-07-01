/**
 * app/api/admin/categories/route.ts
 *
 * GET    — list all blog categories
 * POST   — create a new category
 * DELETE — remove a category (query param ?id=...)
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logApiError } from "@/lib/errors/logger";
import { CACHE_TAGS } from "@/lib/data/tools";

async function requireAdmin() {
  const store = await cookies();
  const token = store.get("admin_token")?.value;
  return getAdminFromToken(token ?? "");
}

export async function GET() {
  try {
    const cats = await prisma.blogCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json(cats);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/categories" });
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });

    const cat = await prisma.blogCategory.create({ data: parsed.data });

    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");

    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/categories" });
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await prisma.blogCategory.delete({ where: { id } });

    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/categories" });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
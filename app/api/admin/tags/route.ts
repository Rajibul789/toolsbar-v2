/**
 * app/api/admin/tags/route.ts
 *
 * GET    — list all blog tags with post counts
 * POST   — create a new tag
 * DELETE — remove a tag (query param ?id=...)
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
    const tags = await prisma.blogTag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json(tags);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/tags" });
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });

    const tag = await prisma.blogTag.create({ data: parsed.data });

    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");

    return NextResponse.json(tag, { status: 201 });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/tags" });
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await prisma.blogTag.delete({ where: { id } });

    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/tags" });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
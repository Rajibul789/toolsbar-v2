import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logApiError } from "@/lib/errors/logger";
import { CACHE_TAGS } from "@/lib/data/tools";

const updateSchema = z.object({
  title:           z.string().min(5).optional(),
  slug:            z.string().min(3).optional(),
  excerpt:         z.string().min(20).optional(),
  content:         z.string().min(50).optional(),
  categoryId:      z.string().optional(),
  status:          z.enum(["DRAFT","PUBLISHED","SCHEDULED","ARCHIVED"]).optional(),
  seoTitle:        z.string().optional(),
  seoDesc:         z.string().optional(),
  seoKeywords:     z.string().optional(),
  relatedToolSlug: z.string().optional(),
  featuredImage:   z.string().optional(),
});

async function auth() {
  const store = await cookies();
  const token = store.get("admin_token")?.value;
  return getAdminFromToken(token ?? "");
}

// GET single post
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await auth();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: { author: { select: { name: true, email: true } }, category: true, tags: true },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/blog/[id]" });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH — update post
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await auth();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });

    const data: Record<string, unknown> = { ...parsed.data };

    // ── publishedAt sync ──────────────────────────────────────────────────────
    // Rule: publishedAt must always accurately reflect the post's public state.
    // • PUBLISHED  → set publishedAt to now if not already set
    // • DRAFT      → clear publishedAt (post is NOT publicly visible)
    // • ARCHIVED   → clear publishedAt (post is NOT publicly visible)
    // • SCHEDULED  → leave publishedAt as-is (set manually or by a scheduler)
    if (parsed.data.status === "PUBLISHED") {
      // Only set publishedAt if this is a fresh publish (don't overwrite original date)
      const existing = await prisma.blogPost.findUnique({ where: { id }, select: { publishedAt: true } });
      if (!existing?.publishedAt) {
        data.publishedAt = new Date();
      }
    } else if (parsed.data.status === "DRAFT" || parsed.data.status === "ARCHIVED") {
      data.publishedAt = null;  // clear — draft/archived posts must NOT have a publishedAt
    }

    const post = await prisma.blogPost.update({ where: { id }, data });

    // Invalidate public blog pages so edits (including publish/unpublish) reflect immediately
    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/");

    return NextResponse.json(post);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/blog/[id]" });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// DELETE post
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await auth();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const deleted = await prisma.blogPost.delete({ where: { id } });

    // Invalidate blog cache so deleted post disappears from public site immediately
    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");
    revalidatePath(`/blog/${deleted.slug}`);
    revalidatePath("/");

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/blog/[id]" });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
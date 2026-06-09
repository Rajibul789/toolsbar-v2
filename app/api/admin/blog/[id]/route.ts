import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { cookies } from "next/headers";

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
  } catch {
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
    if (parsed.data.status === "PUBLISHED") data.publishedAt = new Date();

    const post = await prisma.blogPost.update({ where: { id }, data });
    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// DELETE post
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await auth();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

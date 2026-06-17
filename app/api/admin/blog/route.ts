import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logApiError } from "@/lib/errors/logger";

const createSchema = z.object({
  title:           z.string().min(5),
  slug:            z.string().min(3),
  excerpt:         z.string().min(20),
  content:         z.string().min(50),
  categoryId:      z.string().min(1),
  status:          z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).default("DRAFT"),
  seoTitle:        z.string().optional(),
  seoDesc:         z.string().optional(),
  seoKeywords:     z.string().optional(),
  relatedToolSlug: z.string().optional(),
  faqSchema:       z.unknown().optional(),
});

// GET: list published posts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page  = Number(searchParams.get("page")  ?? 1);
    const limit = Number(searchParams.get("limit") ?? 12);
    const cat   = searchParams.get("category");
    const tag   = searchParams.get("tag");

    const where: Record<string, unknown> = { status: "PUBLISHED" };
    if (cat) where.category = { slug: cat };
    if (tag) where.tags = { some: { tag: { slug: tag } } };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, slug: true, excerpt: true,
          featuredImage: true, publishedAt: true,
          author:   { select: { name: true } },
          category: { select: { name: true, slug: true } },
          tags:     { select: { tag: { select: { name: true, slug: true } } } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    await logApiError(err, { route: "/api/admin/blog" });
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

// POST: create post (admin only)
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    const admin = await getAdminFromToken(token ?? "");

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const { categoryId, faqSchema, ...data } = parsed.data;

    // Resolve or create category
    let category = await prisma.blogCategory.findFirst({ where: { slug: categoryId } });
    if (!category) {
      category = await prisma.blogCategory.create({
        data: { name: categoryId, slug: categoryId },
      });
    }

    const post = await prisma.blogPost.create({
      data: {
        ...data,
        authorId:    admin.id,
        categoryId:  category.id,
        publishedAt: data.status === "PUBLISHED" ? new Date() : undefined,
        faqSchema:   faqSchema ?? undefined,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    console.error(err);
    await logApiError(err, { route: "/api/admin/blog" });
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
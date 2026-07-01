import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logApiError } from "@/lib/errors/logger";
import { CACHE_TAGS } from "@/lib/data/tools";

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

// GET: list ALL posts for admin (no status filter — drafts/scheduled/archived all visible)
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    const admin = await getAdminFromToken(token ?? "");
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page   = Number(searchParams.get("page")  ?? 1);
    const limit  = Number(searchParams.get("limit") ?? 50);
    const status = searchParams.get("status"); // optional filter by specific status

    // Admin sees all statuses; optionally filter to one status via ?status=DRAFT etc.
    const where: Record<string, unknown> = {};
    if (status && ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"].includes(status)) {
      where.status = status;
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, slug: true, excerpt: true, status: true,
          featuredImage: true, publishedAt: true, views: true,
          category: { select: { name: true, slug: true } },
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

    // Invalidate public blog cache so the new post appears immediately
    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");
    revalidatePath("/");                           // homepage blog preview section
    if (data.status === "PUBLISHED") {
      revalidatePath(`/blog/${post.slug}`);
    }

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    console.error(err);
    await logApiError(err, { route: "/api/admin/blog" });
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
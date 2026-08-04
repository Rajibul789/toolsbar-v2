/**
 * app/api/admin/blog/featured/route.ts
 *
 * GET   — the ordered list of currently-featured posts, plus all published
 *         posts available to feature.
 * PATCH — replace the featured list (an ordered array of post slugs).
 *
 * Storage: HomepageConfig row with key "featured_post_slugs", value = a
 * JSON-encoded array of slugs. This reuses the existing KV settings table
 * (same one Homepage Builder already uses) rather than adding new BlogPost
 * columns, which would need a database migration. The admin UI previously
 * at /admin/blog/featured kept this list only in local React state with no
 * backing API at all — nothing was ever actually persisted.
 */
import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { logApiError } from "@/lib/errors/logger";
import { CACHE_TAGS } from "@/lib/data/tools";

const KEY = "featured_post_slugs";

const POST_SELECT = {
  id: true, title: true, slug: true, excerpt: true, status: true,
  featuredImage: true, publishedAt: true,
  category: { select: { name: true, slug: true } },
} as const;

interface FeaturedPostRow {
  id: string; title: string; slug: string; excerpt: string; status: string;
  featuredImage: string | null; publishedAt: Date | null;
  category: { name: string; slug: string } | null;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const admin = await getAdminFromToken(token ?? "");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [row, allPublished] = await Promise.all([
      prisma.homepageConfig.findUnique({ where: { key: KEY }, select: { value: true } }),
      prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        select: POST_SELECT,
      }),
    ]);
    const posts = allPublished as FeaturedPostRow[];

    let slugs: string[] = [];
    try { slugs = row?.value ? JSON.parse(row.value) : []; } catch { slugs = []; }

    const bySlug = new Map(posts.map((p: FeaturedPostRow) => [p.slug, p]));
    const featured = slugs.map((s) => bySlug.get(s)).filter((p): p is FeaturedPostRow => Boolean(p));

    return NextResponse.json({ featured, available: posts });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/blog/featured" });
    return NextResponse.json({ error: "Failed to load featured posts" }, { status: 500 });
  }
}

const schema = z.object({ slugs: z.array(z.string()) });

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const admin = await getAdminFromToken(token ?? "");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    // Only allow slugs that are actually real, published posts — silently
    // drop anything else rather than persisting a dangling reference.
    const valid = await prisma.blogPost.findMany({
      where: { slug: { in: parsed.data.slugs }, status: "PUBLISHED" },
      select: { slug: true },
    });
    const validSlugs = new Set(valid.map((p: { slug: string }) => p.slug));
    const ordered = parsed.data.slugs.filter((s) => validSlugs.has(s));

    await prisma.homepageConfig.upsert({
      where:  { key: KEY },
      update: { value: JSON.stringify(ordered) },
      create: { key: KEY, value: JSON.stringify(ordered), type: "JSON", group: "blog", label: "Featured post slugs" },
    });

    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");
    revalidatePath("/");

    return NextResponse.json({ slugs: ordered });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/blog/featured" });
    return NextResponse.json({ error: "Failed to save featured posts" }, { status: 500 });
  }
}

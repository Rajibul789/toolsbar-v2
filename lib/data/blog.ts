/**
 * lib/data/blog.ts
 *
 * Server-side blog data fetching with Next.js `unstable_cache`.
 * Invalidated by `revalidateTag("blog-posts")` in admin API routes.
 */

import { unstable_cache } from "next/cache";
import prisma from "@/lib/db";
import { CACHE_TAGS } from "./tools";

export interface PublicBlogPost {
  id:            string;
  slug:          string;
  title:         string;
  excerpt:       string;
  featuredImage: string | null;
  publishedAt:   Date | null;
  readTimeMin:   number;
  category: {
    name: string;
    slug: string;
  } | null;
  tags: Array<{ name: string; slug: string }>;
}

/** Fallback static posts — used when DB is unavailable */
const STATIC_POSTS: PublicBlogPost[] = [
  {
    id: "static-1",
    slug: "how-to-split-pdf-online-free",
    title: "How to Split a PDF Online for Free — No Uploads Required",
    excerpt: "Learn how to extract specific pages or page ranges from any PDF document, completely in your browser with zero file uploads.",
    featuredImage: null,
    publishedAt: new Date("2025-01-15"),
    readTimeMin: 4,
    category: { name: "PDF Tools", slug: "pdf-tools" },
    tags: [{ name: "pdf", slug: "pdf" }, { name: "split", slug: "split" }],
  },
  {
    id: "static-2",
    slug: "compress-images-without-losing-quality",
    title: "How to Compress Images Without Losing Quality",
    excerpt: "The right compression settings can reduce image file size by 60–80% while keeping visuals sharp.",
    featuredImage: null,
    publishedAt: new Date("2025-01-12"),
    readTimeMin: 5,
    category: { name: "Image Tools", slug: "image-tools" },
    tags: [{ name: "images", slug: "images" }],
  },
  {
    id: "static-3",
    slug: "word-to-pdf-conversion-guide",
    title: "Convert Word to PDF in 2025: The Complete Guide",
    excerpt: "Everything about converting DOC and DOCX files to PDF — formatting, quality, and the best free tools.",
    featuredImage: null,
    publishedAt: new Date("2025-01-10"),
    readTimeMin: 6,
    category: { name: "Text Tools", slug: "text-tools" },
    tags: [{ name: "word", slug: "word" }, { name: "pdf", slug: "pdf" }],
  },
];

/** Estimate reading time from content length */
function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/** Fetch published blog posts from DB, falling back to static data */
export const getPublishedPosts = unstable_cache(
  async (
    opts: { page?: number; limit?: number; categorySlug?: string; tagSlug?: string } = {}
  ): Promise<{ posts: PublicBlogPost[]; total: number }> => {
    const { page = 1, limit = 12, categorySlug, tagSlug } = opts;

    try {
      const where: Record<string, unknown> = { status: "PUBLISHED" };
      if (categorySlug) where.category = { slug: categorySlug };
      if (tagSlug) where.tags = { some: { tag: { slug: tagSlug } } };

      const [raw, total] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          skip:  (page - 1) * limit,
          take:  limit,
          select: {
            id: true, slug: true, title: true, excerpt: true,
            featuredImage: true, publishedAt: true, content: true,
            category: { select: { name: true, slug: true } },
            tags:     { select: { tag: { select: { name: true, slug: true } } } },
          },
        }),
        prisma.blogPost.count({ where }),
      ]);

      type RawPost = {
        id: string; slug: string; title: string; excerpt: string;
        featuredImage: string | null; publishedAt: Date | null; content: string;
        category: { name: string; slug: string } | null;
        tags: Array<{ tag: { name: string; slug: string } }>;
      };

      const posts: PublicBlogPost[] = (raw as RawPost[]).map((p) => ({
        id:            p.id,
        slug:          p.slug,
        title:         p.title,
        excerpt:       p.excerpt,
        featuredImage: p.featuredImage,
        publishedAt:   p.publishedAt,
        readTimeMin:   estimateReadTime(p.content),
        category:      p.category,
        tags:          p.tags.map((t) => t.tag),
      }));

      // If DB has posts use them, otherwise fall back to static
      if (posts.length > 0) return { posts, total };
      return { posts: STATIC_POSTS, total: STATIC_POSTS.length };

    } catch {
      return { posts: STATIC_POSTS, total: STATIC_POSTS.length };
    }
  },
  ["published-posts"],
  { tags: [CACHE_TAGS.blogPosts], revalidate: 60 }
);

/** Fetch a single published blog post by slug */
export const getPostBySlug = unstable_cache(
  async (slug: string) => {
    try {
      return await prisma.blogPost.findFirst({
        where: { slug, status: "PUBLISHED" },
        include: {
          author:   { select: { name: true } },
          category: { select: { name: true, slug: true } },
          tags:     { select: { tag: { select: { name: true, slug: true } } } },
        },
      });
    } catch {
      return null;
    }
  },
  ["post-by-slug"],
  { tags: [CACHE_TAGS.blogPosts], revalidate: 60 }
);
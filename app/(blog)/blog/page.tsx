import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { BlogSearch } from "@/components/blog/BlogSearch";
import { getPublishedPosts, type PublicBlogPost } from "@/lib/data/blog";

export const metadata: Metadata = {
  title: "Blog – PDF & Image Tool Guides | ToolsBar",
  description:
    "Tutorials, guides, and tips for working with PDFs, images, and documents. Learn how to split PDFs, compress images, convert Word to PDF, and more.",
  alternates: { canonical: "/blog" },
};

function BlogCard({ post, featured = false }: { post: PublicBlogPost; featured?: boolean }) {
  return (
    <article className={`blog-card ${featured ? "md:col-span-2" : ""}`}>
      <div
        className="h-1"
        style={{ background: "linear-gradient(90deg, rgba(0,245,255,0.6), rgba(191,0,255,0.6))" }}
      />
      <div className="p-6">
        {featured && (
          <span className="badge-neon text-[10px] mb-3 inline-flex">FEATURED</span>
        )}

        <div className="flex items-center gap-3 mb-3">
          {post.category && (
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="text-[11px] font-mono text-neon-cyan hover:text-neon-cyan/80 transition-colors"
            >
              {post.category.name}
            </Link>
          )}
          {post.category && <span className="text-text-muted text-[11px]">·</span>}
          <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
            <Clock className="w-3 h-3" />
            {post.readTimeMin} min read
          </div>
        </div>

        <Link href={`/blog/${post.slug}`} className="group block">
          <h2
            className={`font-display font-bold text-white group-hover:text-neon-cyan transition-colors mb-3 leading-snug ${
              featured ? "text-xl md:text-2xl" : "text-base"
            }`}
          >
            {post.title}
          </h2>
        </Link>

        <p className="text-sm text-text-muted font-mono leading-relaxed mb-4 line-clamp-2">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
            <Calendar className="w-3 h-3" />
            {post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })
              : "—"}
          </div>

          <div className="flex gap-1.5">
            {post.tags.slice(0, 2).map((tag) => (
              <Link
                key={tag.slug}
                href={`/blog/tag/${tag.slug}`}
                className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors"
                style={{
                  background: "rgba(0,245,255,0.05)",
                  border:     "1px solid rgba(0,245,255,0.12)",
                  color:      "#475569",
                }}
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

// Server component — fetches posts from DB (with static fallback).
// Invalidated by revalidateTag("blog-posts") in admin API routes.
export default async function BlogPage() {
  const { posts } = await getPublishedPosts({ limit: 20 });
  const featured = posts.find((_, i) => i === 0) ?? null;
  const rest = posts.slice(1);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="section-label justify-center mb-4">Blog</div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white mb-4">
            GUIDES & TUTORIALS
          </h1>
          <p className="text-text-muted font-mono text-sm max-w-xl mx-auto">
            In-depth guides on PDF tools, image processing, document conversion, and productivity workflows.
          </p>
        </div>

        {/* Client search — receives server-fetched posts */}
        <BlogSearch posts={posts} />

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {featured && <BlogCard post={featured} featured />}
          {rest.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}
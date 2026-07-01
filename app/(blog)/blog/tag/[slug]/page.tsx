import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Tag, Clock, Calendar } from "lucide-react";
import { getPublishedPosts } from "@/lib/data/blog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tagName = slug.replace(/-/g, " ");
  return {
    title: `#${tagName} Articles | ToolsBar Blog`,
    description: `Browse all ToolsBar articles tagged with "${tagName}".`,
    alternates: { canonical: `/blog/tag/${slug}` },
  };
}

export default async function BlogTagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tagName = slug.replace(/-/g, " ");

  // Fetch posts for this tag from DB (with static fallback)
  const { posts, total } = await getPublishedPosts({ tagSlug: slug, limit: 20 });

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" />All Articles
        </Link>

        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)" }}>
            <Tag className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <p className="text-[11px] font-mono text-text-muted uppercase tracking-widest">Tag</p>
            <h1 className="font-display text-2xl font-black text-white tracking-wider">
              #{tagName.toUpperCase()}
            </h1>
            <p className="text-[11px] font-mono text-text-muted mt-0.5">{total} article{total !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <article key={post.slug} className="blog-card group">
                <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, rgba(0,245,255,0.6), rgba(191,0,255,0.6))" }} />
                <div className="p-5">
                  {post.category && (
                    <Link href={`/blog/category/${post.category.slug}`}
                      className="text-[11px] font-mono text-neon-cyan hover:text-neon-cyan/80 mb-3 inline-block">
                      {post.category.name}
                    </Link>
                  )}
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="font-display text-sm font-bold text-white group-hover:text-neon-cyan transition-colors leading-snug mb-3 tracking-wide">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="text-xs text-text-muted font-mono leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTimeMin} min</span>
                    {post.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl p-8 text-center" style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)" }}>
            <p className="text-sm font-mono text-text-muted">
              No articles tagged with <span className="text-neon-cyan">#{tagName}</span> yet.
            </p>
            <Link href="/blog" className="btn-neon inline-flex mt-4 text-sm">View All Articles</Link>
          </div>
        )}
      </div>
    </div>
  );
}
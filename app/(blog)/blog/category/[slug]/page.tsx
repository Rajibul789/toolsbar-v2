import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { getPublishedPosts } from "@/lib/data/blog";

const CATEGORIES: Record<string, { name: string; desc: string; color: string }> = {
  "pdf-tools":       { name: "PDF Tools",        desc: "Guides on splitting, merging, compressing, and converting PDFs.",              color: "#00f5ff" },
  "image-tools":     { name: "Image Tools",      desc: "Tutorials on image compression, conversion, and optimization.",               color: "#bf00ff" },
  "text-tools":      { name: "Text & Document",  desc: "Guides for Word to PDF, text conversion, and document workflows.",            color: "#00ff88" },
  "social-tools":    { name: "Social & Marketing", desc: "Tips for hashtags, link sharing, and content optimization.",                color: "#ff00aa" },
  "developer-tools": { name: "Developer Tools",  desc: "Tutorials for QR codes, code packaging, and developer utilities.",           color: "#ff6600" },
};

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES[slug];
  if (!cat) return {};
  return {
    title: `${cat.name} Articles | ToolsBar Blog`,
    description: cat.desc,
    alternates: { canonical: `/blog/category/${slug}` },
  };
}

export default async function BlogCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATEGORIES[slug];
  if (!cat) notFound();

  // Fetch published posts for this category from DB (with static fallback)
  const { posts, total } = await getPublishedPosts({ categorySlug: slug, limit: 20 });

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" />All Articles
        </Link>

        <div className="mb-10">
          <div className="section-label mb-4">Category</div>
          <h1 className="font-display text-3xl font-black text-white mb-3 tracking-wider" style={{ color: cat.color, textShadow: `0 0 20px ${cat.color}40` }}>
            {cat.name.toUpperCase()}
          </h1>
          <p className="text-sm text-text-muted font-mono">{cat.desc}</p>
          <p className="text-[11px] font-mono text-text-muted mt-2">{total} article{total !== 1 ? "s" : ""}</p>
        </div>

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <article key={post.slug} className="blog-card group">
                <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${cat.color}80, transparent)` }} />
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                      <Clock className="w-3 h-3" />{post.readTimeMin} min
                    </div>
                  </div>
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="font-display text-sm font-bold text-white group-hover:text-neon-cyan transition-colors leading-snug mb-3 tracking-wide">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="text-xs text-text-muted font-mono leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                    <Calendar className="w-3 h-3" />
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl p-8 text-center" style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)" }}>
            <p className="text-sm font-mono text-text-muted">No articles in this category yet.</p>
            <Link href="/blog" className="btn-neon inline-flex mt-4 text-sm">View All Articles</Link>
          </div>
        )}
      </div>
    </div>
  );
}
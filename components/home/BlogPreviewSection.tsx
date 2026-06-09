import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "lucide-react";

const PREVIEW_POSTS = [
  {
    slug: "how-to-split-pdf-online-free",
    title: "How to Split a PDF Online for Free",
    excerpt: "Extract specific pages from any PDF completely in your browser — zero file uploads, instant results.",
    category: "PDF Tools",
    categorySlug: "pdf-tools",
    readTime: "4 min",
    date: "Jan 15, 2025",
    color: "#00f5ff",
  },
  {
    slug: "compress-images-without-losing-quality",
    title: "Compress Images Without Losing Quality",
    excerpt: "The right quality settings can shrink image size by 60–80% while keeping visuals crisp.",
    category: "Image Tools",
    categorySlug: "image-tools",
    readTime: "5 min",
    date: "Jan 12, 2025",
    color: "#bf00ff",
  },
  {
    slug: "word-to-pdf-conversion-guide",
    title: "Convert Word to PDF: The Complete Guide",
    excerpt: "Everything about converting DOCX to PDF — formatting, quality, and the best free tools in 2025.",
    category: "Text Tools",
    categorySlug: "text-tools",
    readTime: "6 min",
    date: "Jan 10, 2025",
    color: "#00ff88",
  },
];

export function BlogPreviewSection() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="section-label mb-3">Blog</div>
          <h2 className="font-display text-3xl font-black text-white">
            LATEST GUIDES
          </h2>
        </div>
        <Link
          href="/blog"
          className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-neon-cyan/70 hover:text-neon-cyan transition-colors group"
        >
          All articles
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PREVIEW_POSTS.map((post) => (
          <article
            key={post.slug}
            className="glass-panel overflow-hidden group hover:shadow-glass-hover transition-all duration-300 hover:-translate-y-1"
          >
            {/* Color bar */}
            <div
              className="h-0.5 w-full"
              style={{ background: `linear-gradient(90deg, ${post.color}80, transparent)` }}
            />

            <div className="p-5">
              {/* Meta */}
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href={`/blog/category/${post.categorySlug}`}
                  className="text-[11px] font-mono transition-colors"
                  style={{ color: post.color }}
                >
                  {post.category}
                </Link>
                <span className="text-text-muted/40 text-xs">·</span>
                <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                  <Clock className="w-3 h-3" />
                  {post.readTime}
                </div>
              </div>

              {/* Title */}
              <Link href={`/blog/${post.slug}`}>
                <h3 className="font-display text-sm font-bold text-white group-hover:text-neon-cyan transition-colors leading-snug mb-3 tracking-wide">
                  {post.title.toUpperCase()}
                </h3>
              </Link>

              <p className="text-xs text-text-muted font-mono leading-relaxed mb-4 line-clamp-2">
                {post.excerpt}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                  <Calendar className="w-3 h-3" />
                  {post.date}
                </div>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-[11px] font-mono flex items-center gap-1 transition-all"
                  style={{ color: `${post.color}80` }}
                >
                  Read
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Mobile "all articles" link */}
      <div className="text-center mt-8 sm:hidden">
        <Link href="/blog" className="btn-neon text-sm inline-flex items-center gap-2">
          View All Articles <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

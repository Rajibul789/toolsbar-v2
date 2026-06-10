import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { BlogSearch } from "@/components/blog/BlogSearch";

export const metadata: Metadata = {
  title: "Blog – PDF & Image Tool Guides | ToolsBar",
  description:
    "Tutorials, guides, and tips for working with PDFs, images, and documents. Learn how to split PDFs, compress images, convert Word to PDF, and more.",
  alternates: { canonical: "/blog" },
};

// Static placeholder posts — replace with Prisma DB fetch in production
const BLOG_POSTS = [
  {
    slug: "how-to-split-pdf-online-free",
    title: "How to Split a PDF Online for Free — No Uploads Required",
    excerpt: "Learn how to extract specific pages or page ranges from any PDF document, completely in your browser with zero file uploads.",
    category: "PDF Tools",
    categorySlug: "pdf-tools",
    readTime: "4 min read",
    date: "2025-01-15",
    tags: ["pdf", "split", "browser-tools"],
    featured: true,
  },
  {
    slug: "compress-images-without-losing-quality",
    title: "How to Compress Images Without Losing Quality",
    excerpt: "The right compression settings can reduce image file size by 60–80% while keeping visuals sharp. Here's exactly how to do it.",
    category: "Image Tools",
    categorySlug: "image-tools",
    readTime: "5 min read",
    date: "2025-01-12",
    tags: ["images", "compression", "optimization"],
    featured: false,
  },
  {
    slug: "word-to-pdf-conversion-guide",
    title: "Convert Word to PDF in 2025: The Complete Guide",
    excerpt: "Everything you need to know about converting DOC and DOCX files to PDF — formatting, quality, and the best free tools.",
    category: "Text Tools",
    categorySlug: "text-tools",
    readTime: "6 min read",
    date: "2025-01-10",
    tags: ["word", "pdf", "conversion"],
    featured: false,
  },
  {
    slug: "pdf-merge-vs-split-when-to-use",
    title: "PDF Merge vs PDF Split: When to Use Each Tool",
    excerpt: "Understanding when to combine PDFs and when to break them apart — practical examples for students, professionals, and businesses.",
    category: "PDF Tools",
    categorySlug: "pdf-tools",
    readTime: "3 min read",
    date: "2025-01-08",
    tags: ["pdf", "merge", "split"],
    featured: false,
  },
  {
    slug: "best-image-formats-web-2025",
    title: "JPG vs PNG vs WebP: Which Image Format Should You Use in 2025?",
    excerpt: "A comprehensive comparison of web image formats — file size, quality, browser support, and when to use each one.",
    category: "Image Tools",
    categorySlug: "image-tools",
    readTime: "7 min read",
    date: "2025-01-05",
    tags: ["images", "webp", "formats"],
    featured: false,
  },
  {
    slug: "extract-text-from-pdf-guide",
    title: "How to Extract Text from a PDF (3 Methods That Actually Work)",
    excerpt: "Whether your PDF has a text layer or is a scanned image, here are the best approaches for getting selectable text out of it.",
    category: "PDF Tools",
    categorySlug: "pdf-tools",
    readTime: "5 min read",
    date: "2025-01-02",
    tags: ["pdf", "text extraction", "ocr"],
    featured: false,
  },
];

const CATEGORIES = [
  { name: "All Posts",      slug: "",              count: BLOG_POSTS.length },
  { name: "PDF Tools",      slug: "pdf-tools",     count: 3 },
  { name: "Image Tools",    slug: "image-tools",   count: 2 },
  { name: "Text Tools",     slug: "text-tools",    count: 1 },
];

function BlogCard({ post, featured = false }: { post: typeof BLOG_POSTS[0]; featured?: boolean }) {
  return (
    <article className={`blog-card ${featured ? "md:col-span-2" : ""}`}>
      {/* Color accent top bar */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, rgba(0,245,255,0.6), rgba(191,0,255,0.6))`,
        }}
      />

      <div className="p-6">
        {featured && (
          <span className="badge-neon text-[10px] mb-3 inline-flex">FEATURED</span>
        )}

        <div className="flex items-center gap-3 mb-3">
          <Link
            href={`/blog/category/${post.categorySlug}`}
            className="text-[11px] font-mono text-neon-cyan hover:text-neon-cyan/80 transition-colors"
          >
            {post.category}
          </Link>
          <span className="text-text-muted text-[11px]">·</span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
            <Clock className="w-3 h-3" />
            {post.readTime}
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
            {new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>

          <div className="flex gap-1.5">
            {post.tags.slice(0, 2).map((tag) => (
              <Link
                key={tag}
                href={`/blog/tag/${tag.replace(/\s+/g, "-")}`}
                className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors"
                style={{ background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.12)", color: "#475569" }}
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BlogPage() {
  const featured = BLOG_POSTS.find((p) => p.featured);
  const rest = BLOG_POSTS.filter((p) => !p.featured);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="section-label justify-center mb-4">Blog</div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white mb-4">
            GUIDES & TUTORIALS
          </h1>
          <p className="text-text-muted font-mono text-sm max-w-xl mx-auto">
            In-depth guides on PDF tools, image processing, document conversion, and productivity workflows.
          </p>
        </div>

        {/* Search */}
        <BlogSearch posts={BLOG_POSTS} />

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map(({ name, slug, count }) => (
            <Link
              key={name}
              href={slug ? `/blog/category/${slug}` : "/blog"}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono transition-all"
              style={{
                background: !slug ? "rgba(0,245,255,0.1)" : "rgba(0,245,255,0.03)",
                border: `1px solid ${!slug ? "rgba(0,245,255,0.3)" : "rgba(0,245,255,0.1)"}`,
                color: !slug ? "#00f5ff" : "#475569",
              }}
            >
              {name}
              <span
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{ background: "rgba(0,245,255,0.1)" }}
              >
                {count}
              </span>
            </Link>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured && <BlogCard post={featured} featured />}
          {rest.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}
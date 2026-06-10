import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, ChevronRight, Tag, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { JsonLd } from "@/components/seo/JsonLd";
import { TOOLS_CONFIG } from "@/config/tools.config";
import { ToolCard } from "@/components/tools/ToolCard";

// ── Static post data — replace with prisma.blogPost.findUnique() in production ──
const BLOG_POSTS = [
  {
    slug: "how-to-split-pdf-online-free",
    title: "How to Split a PDF Online for Free — No Uploads Required",
    excerpt: "Learn how to extract specific pages or page ranges from any PDF document, completely in your browser with zero file uploads.",
    content: `
## What is PDF Splitting?

PDF splitting is the process of extracting one or more pages from a PDF document into separate files. This is useful when you receive a large PDF and only need specific pages, or when you want to share individual chapters.

## Why Browser-Based Splitting Matters

Traditional PDF tools upload your files to a remote server for processing. This creates privacy risks — especially for documents containing sensitive information like contracts, medical records, or financial data.

ToolsBar's PDF Split tool works directly in your browser. Your file is read by JavaScript running on your own device, and the resulting pages are generated locally. The file **never** travels over the internet.

## How to Split a PDF with ToolsBar

1. Open the [PDF Split tool](/tools/pdf-split)
2. Upload your PDF by clicking the upload zone or dragging the file in
3. Select your split mode: All pages, custom range, even pages, or odd pages
4. For custom ranges, enter page numbers like \`1-3, 5, 7-9\`
5. Click **Split** — processing begins instantly
6. Download individual pages or all pages as a ZIP archive

## Supported Split Modes

| Mode | Description | Example Use |
|------|-------------|-------------|
| All Pages | Extract every page separately | Breaking a 50-page manual into pages |
| Custom Range | Specify exact pages or ranges | Getting pages 3-7 and 12 from a report |
| Even Pages | Extract all even-numbered pages | Separating a double-sided scan |
| Odd Pages | Extract all odd-numbered pages | Getting the first side of each sheet |

## File Size Limits

The PDF Split tool handles files up to 50 MB. Files under 20 MB are processed entirely in your browser. Larger files use our integrated Next.js API route (pdf-lib in Node.js) — your file is never stored permanently.

## Common Use Cases

**Extracting an invoice from a multi-document PDF** — Many accounting systems produce monthly statement PDFs. Split out just the invoice you need.

**Sharing a single chapter from an ebook** — Rather than emailing a 300-page PDF, extract just the chapter relevant to your recipient.

**Separating scanned documents** — When you scan multiple documents in one session, use even/odd split to separate them.
    `,
    category: "PDF Tools",
    categorySlug: "pdf-tools",
    readTime: "4 min read",
    date: "2025-01-15",
    tags: ["pdf", "split", "browser-tools"],
    relatedToolSlug: "pdf-split",
    faq: [
      { q: "Does splitting reduce PDF quality?", a: "No. Pages are extracted at original quality — no re-rendering, no compression." },
      { q: "Can I split password-protected PDFs?", a: "The tool handles most standard encryption automatically. Strongly password-protected files may require the password to be entered first." },
      { q: "How many pages can I extract?", a: "There is no limit. You can split a 500-page PDF and extract all 500 pages in one operation." },
    ],
    author: "ToolsBar Team",
    authorSlug: "toolsbar-team",
  },
  {
    slug: "compress-images-without-losing-quality",
    title: "How to Compress Images Without Losing Quality",
    excerpt: "The right compression settings can reduce image file size by 60–80% while keeping visuals sharp.",
    content: `
## Why Image Compression Matters

Large images slow down websites, apps, and email. Reducing file size without visible quality loss is one of the most effective performance improvements you can make.

## How ToolsBar Image Compression Works

Our tool uses the browser's Canvas API to re-render each image at an adjustable quality level. This is the same technique used by professional image editors — no proprietary algorithms, no server processing.

## Recommended Quality Settings

| Use Case | Recommended Quality |
|----------|-------------------|
| Web / Social Media | 75–85% |
| Email Attachments | 65–75% |
| Print / Archive | 85–95% |

## Supported Formats

- **JPEG** — best for photos, supports lossy compression
- **PNG** — best for graphics with transparency (lossless)
- **WebP** — best for web, excellent compression ratio

## Tips for Best Results

1. Start with quality 80% — most images look identical to the original
2. Compare the before/after file sizes shown in the results
3. For PNG files, try converting to WebP for 25–35% additional savings
    `,
    category: "Image Tools",
    categorySlug: "image-tools",
    readTime: "5 min read",
    date: "2025-01-12",
    tags: ["images", "compression", "optimization"],
    relatedToolSlug: "image-compressor",
    faq: [
      { q: "What is the maximum image size?", a: "You can compress images up to 20MB per file, with up to 10 images per batch." },
      { q: "Will the compressed image look different?", a: "At 80% quality, most images are visually indistinguishable from the original. Lower settings may introduce artifacts in photos." },
    ],
    author: "ToolsBar Team",
    authorSlug: "toolsbar-team",
  },
  {
    slug: "word-to-pdf-conversion-guide",
    title: "Convert Word to PDF in 2025: The Complete Guide",
    excerpt: "Everything you need to know about converting DOC and DOCX files to PDF — formatting, quality, and the best free tools.",
    content: `
## Why Convert Word to PDF?

PDF is the universal document format — it looks identical on every device, cannot be accidentally edited, and is accepted by virtually every institution. Converting your Word documents to PDF is essential for sharing professional documents.

## How ToolsBar Word to PDF Works

ToolsBar uses **Mammoth.js** to convert your DOCX file to HTML, then **jsPDF** and **html2canvas** to render that HTML into a PDF — all in your browser.

**No Word installation required. No file uploads. Completely private.**

## What Formatting is Preserved

| Element | Preserved? |
|---------|-----------|
| Headings (H1–H4) | ✅ Yes |
| Bold, Italic | ✅ Yes |
| Ordered & Unordered Lists | ✅ Yes |
| Tables | ✅ Yes |
| Hyperlinks | ✅ Yes |
| Complex multi-column layouts | ⚠️ Partial |
| Custom fonts | ⚠️ Fallback to standard font |
| Images embedded in DOCX | ✅ Yes |

## Step-by-Step Guide

1. Go to the [Word to PDF tool](/tools/word-to-pdf)
2. Upload your **.docx** or **.doc** file
3. A preview of the converted content is shown
4. Click **Convert to PDF**
5. Download your PDF file
    `,
    category: "Text Tools",
    categorySlug: "text-tools",
    readTime: "6 min read",
    date: "2025-01-10",
    tags: ["word", "pdf", "conversion"],
    relatedToolSlug: "word-to-pdf",
    faq: [
      { q: "Does it work without Microsoft Word installed?", a: "Yes — the conversion is handled by Mammoth.js in your browser. No Word installation needed." },
      { q: "What is the maximum file size?", a: "DOCX files up to 20MB are supported." },
    ],
    author: "ToolsBar Team",
    authorSlug: "toolsbar-team",
  },
];

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | ToolsBar Blog`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title: post.title, description: post.excerpt, type: "article", publishedTime: post.date, authors: [post.author] },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const relatedTool = post.relatedToolSlug
    ? TOOLS_CONFIG.find((t) => t.slug === post.relatedToolSlug)
    : null;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Organization", name: "ToolsBar Team" },
    publisher: { "@type": "Organization", name: "ToolsBar", url: "https://toolsbar.com" },
    url: `https://toolsbar.com/blog/${post.slug}`,
  };

  const faqSchema = post.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  } : null;

  return (
    <>
      <JsonLd data={articleSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}

      <div className="min-h-screen pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors mb-8">
            <ArrowLeft className="w-3.5 h-3.5" />Back to Blog
          </Link>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs font-mono text-text-muted mb-6">
            <Link href="/"    className="hover:text-neon-cyan transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/blog" className="hover:text-neon-cyan transition-colors">Blog</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/blog/category/${post.categorySlug}`} className="hover:text-neon-cyan transition-colors">{post.category}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-text-primary truncate max-w-xs">{post.title.slice(0, 40)}…</span>
          </nav>

          <article>
            {/* Article header */}
            <header className="mb-10">
              <Link href={`/blog/category/${post.categorySlug}`}
                className="text-xs font-mono text-neon-cyan hover:underline mb-3 inline-block">
                {post.category}
              </Link>
              <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight mb-5">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text-muted pb-6 border-b border-neon-cyan/8">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{post.readTime}</span>
                <Link href={`/blog/author/${post.authorSlug}`} className="hover:text-neon-cyan transition-colors">
                  By {post.author}
                </Link>
              </div>
            </header>

            {/* Article body — react-markdown with GFM */}
            <div className="prose-cyber">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="font-display text-2xl font-bold text-neon-cyan mt-8 mb-3" style={{ textShadow: "0 0 8px rgba(0,245,255,0.3)" }}>{children}</h1>,
                  h2: ({ children }) => <h2 className="font-display text-xl font-bold text-neon-cyan mt-8 mb-3 pb-2" style={{ borderBottom: "1px solid rgba(0,245,255,0.15)", textShadow: "0 0 8px rgba(0,245,255,0.3)" }}>{children}</h2>,
                  h3: ({ children }) => <h3 className="font-display text-base font-bold text-text-primary mt-6 mb-2">{children}</h3>,
                  p:  ({ children }) => <p className="text-text-secondary text-sm leading-relaxed mb-4 font-mono">{children}</p>,
                  a:  ({ href, children }) => <a href={href} className="text-neon-cyan border-b border-neon-cyan/30 hover:border-neon-cyan transition-colors">{children}</a>,
                  strong: ({ children }) => <strong className="text-text-primary font-semibold">{children}</strong>,
                  em:     ({ children }) => <em className="text-neon-cyan italic">{children}</em>,
                  code:   ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    return isBlock
                      ? <code className="block code-block my-4 text-xs">{children}</code>
                      : <code className="text-neon-green bg-neon-green/8 border border-neon-green/15 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
                  },
                  pre:  ({ children }) => <pre className="code-block my-4 text-xs overflow-x-auto">{children}</pre>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-neon-cyan pl-4 my-4 italic text-text-muted text-sm font-mono">{children}</blockquote>
                  ),
                  ul: ({ children }) => <ul className="space-y-1.5 my-4 pl-0">{children}</ul>,
                  ol: ({ children }) => <ol className="space-y-1.5 my-4 pl-0 list-decimal list-inside">{children}</ol>,
                  li: ({ children }) => (
                    <li className="flex gap-2 text-sm text-text-muted font-mono">
                      <span className="text-neon-cyan mt-1 flex-shrink-0">▸</span>
                      <span>{children}</span>
                    </li>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="w-full text-xs font-mono border-collapse">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-2.5 text-left text-neon-cyan/80 font-semibold text-[11px] uppercase tracking-wider"
                      style={{ background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.15)" }}>
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2.5 text-text-muted"
                      style={{ border: "1px solid rgba(0,245,255,0.08)" }}>
                      {children}
                    </td>
                  ),
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-neon-cyan/8">
              <Tag className="w-3.5 h-3.5 text-text-muted" />
              {post.tags.map((tag) => (
                <Link key={tag} href={`/blog/tag/${tag.replace(/\s+/g, "-")}`}
                  className="text-xs font-mono px-3 py-1 rounded border transition-colors"
                  style={{ background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.12)", color: "#475569" }}>
                  #{tag}
                </Link>
              ))}
            </div>
          </article>

          {/* Related tool CTA */}
          {relatedTool && (
            <div className="mt-12 rounded-2xl p-6" style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.12)" }}>
              <p className="text-xs font-mono text-neon-cyan/60 uppercase tracking-widest mb-4">{'// Try the Tool'}</p>
              <ToolCard tool={relatedTool} />
            </div>
          )}

          {/* FAQ */}
          {post.faq.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-xl font-black text-white tracking-wider mb-6">FREQUENTLY ASKED QUESTIONS</h2>
              <div className="space-y-4">
                {post.faq.map(({ q, a }, i) => (
                  <div key={i} className="glass-panel p-5">
                    <h3 className="text-sm font-mono font-semibold text-text-primary mb-2">{q}</h3>
                    <p className="text-xs text-text-muted font-mono leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
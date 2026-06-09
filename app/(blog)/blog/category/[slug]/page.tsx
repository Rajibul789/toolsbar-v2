import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const CATEGORIES: Record<string, { name: string; desc: string }> = {
  "pdf-tools":       { name: "PDF Tools",       desc: "Guides on splitting, merging, compressing, and converting PDFs." },
  "image-tools":     { name: "Image Tools",     desc: "Tutorials on image compression, conversion, and optimization." },
  "text-tools":      { name: "Text & Document", desc: "Guides for Word to PDF, text conversion, and document workflows." },
  "social-tools":    { name: "Social & Marketing", desc: "Tips for hashtags, link sharing, and content optimization." },
  "developer-tools": { name: "Developer Tools", desc: "Tutorials for QR codes, code packaging, and developer utilities." },
};

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES[slug];
  if (!cat) return {};
  return {
    title: `${cat.name} Articles | ToolsBar Blog`,
    description: cat.desc,
    alternates: { canonical: `/blog/category/${slug}` },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = CATEGORIES[slug];
  if (!cat) notFound();

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All Articles
        </Link>

        <div className="mb-10">
          <div className="section-label mb-4">Category</div>
          <h1 className="font-display text-3xl font-black text-white mb-3 tracking-wider">
            {cat.name.toUpperCase()}
          </h1>
          <p className="text-sm text-text-muted font-mono">{cat.desc}</p>
        </div>

        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: "rgba(0,245,255,0.03)",
            border: "1px solid rgba(0,245,255,0.08)",
          }}
        >
          <p className="text-sm font-mono text-text-muted">
            Articles in this category will appear here.
          </p>
          <Link href="/blog" className="btn-neon inline-flex mt-4 text-sm">
            View All Articles
          </Link>
        </div>
      </div>
    </div>
  );
}

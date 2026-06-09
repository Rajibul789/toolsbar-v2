import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Tag } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tagName = slug.replace(/-/g, " ");
  return {
    title: `#${tagName} Articles | ToolsBar Blog`,
    description: `Browse all ToolsBar articles tagged with "${tagName}".`,
    alternates: { canonical: `/blog/tag/${slug}` },
  };
}

export default async function BlogTagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tagName = slug.replace(/-/g, " ");

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

        <div className="mb-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(0,245,255,0.08)",
              border: "1px solid rgba(0,245,255,0.2)",
            }}
          >
            <Tag className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <p className="text-[11px] font-mono text-text-muted uppercase tracking-widest">
              Tag
            </p>
            <h1 className="font-display text-2xl font-black text-white tracking-wider">
              #{tagName.toUpperCase()}
            </h1>
          </div>
        </div>

        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: "rgba(0,245,255,0.03)",
            border: "1px solid rgba(0,245,255,0.08)",
          }}
        >
          <p className="text-sm font-mono text-text-muted">
            Articles tagged with <span className="text-neon-cyan">#{tagName}</span> will appear here.
          </p>
          <Link href="/blog" className="btn-neon inline-flex mt-4 text-sm">
            View All Articles
          </Link>
        </div>
      </div>
    </div>
  );
}

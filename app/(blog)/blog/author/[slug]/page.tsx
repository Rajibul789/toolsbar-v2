import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

const AUTHORS: Record<string, { name: string; role: string; bio: string; posts: number }> = {
  "toolsbar-team": {
    name: "ToolsBar Team",
    role: "Editorial Team",
    bio: "The ToolsBar team writes in-depth guides on PDF tools, image processing, document conversion, and productivity workflows. Our goal is to help you get more done with the free tools available right in your browser.",
    posts: 6,
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const author = AUTHORS[slug];
  if (!author) return {};
  return {
    title: `${author.name} – ToolsBar Blog`,
    description: author.bio.slice(0, 160),
    alternates: { canonical: `/blog/author/${slug}` },
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = AUTHORS[slug] ?? { name: slug.replace(/-/g, " "), role: "Author", bio: "", posts: 0 };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" />Back to Blog
        </Link>

        {/* Author card */}
        <div className="glass-panel p-8 mb-10">
          <div className="flex items-start gap-6">
            {/* Avatar placeholder */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 font-display text-2xl font-black text-neon-cyan"
              style={{ background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)" }}>
              {author.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display text-2xl font-black text-white tracking-wider">{author.name.toUpperCase()}</h1>
                <span className="badge-neon text-[10px]">{author.role}</span>
              </div>
              <p className="text-sm text-text-muted font-mono leading-relaxed mb-4">{author.bio}</p>
              <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{author.posts} articles published</span>
              </div>
            </div>
          </div>
        </div>

        {/* Articles placeholder */}
        <h2 className="font-display text-lg font-black text-white tracking-wider mb-6">ARTICLES BY {author.name.toUpperCase()}</h2>
        <div className="rounded-xl p-8 text-center" style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)" }}>
          <p className="text-sm font-mono text-text-muted">Articles will appear here once the database is connected.</p>
          <Link href="/blog" className="btn-neon inline-flex mt-4 text-sm">View All Articles</Link>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { getPostsByAuthorSlug } from "@/lib/data/blog";

const AUTHOR_INFO: Record<string, { role: string; bio: string }> = {
  "toolsbar-team": {
    role: "Editorial Team",
    bio: "The ToolsBar team writes in-depth guides on PDF tools, image processing, document conversion, and productivity workflows. Our goal is to help you get more done with the free tools available right in your browser.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPostsByAuthorSlug(slug);
  if (!data) return {};
  const info = AUTHOR_INFO[slug];
  return {
    title: `${data.authorName} – ToolsBar Blog`,
    description: info?.bio.slice(0, 160) ?? `Articles by ${data.authorName} on the ToolsBar blog.`,
    alternates: { canonical: `/blog/author/${slug}` },
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPostsByAuthorSlug(slug);
  if (!data) notFound();

  const { authorName, posts } = data;
  const info = AUTHOR_INFO[slug] ?? { role: "Author", bio: `${authorName} writes for the ToolsBar blog.` };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" />Back to Blog
        </Link>

        {/* Author card */}
        <div className="glass-panel p-8 mb-10">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 font-display text-2xl font-black text-neon-cyan"
              style={{ background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)" }}>
              {authorName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display text-2xl font-black text-white tracking-wider">{authorName.toUpperCase()}</h1>
                <span className="badge-neon text-[10px]">{info.role}</span>
              </div>
              <p className="text-sm text-text-muted font-mono leading-relaxed mb-4">{info.bio}</p>
              <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{posts.length} article{posts.length === 1 ? "" : "s"} published</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real articles list */}
        <h2 className="font-display text-lg font-black text-white tracking-wider mb-6">ARTICLES BY {authorName.toUpperCase()}</h2>
        <div className="space-y-3">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="block glass-panel p-5 hover:border-neon-cyan/30 transition-all group">
              <div className="flex items-center gap-3 mb-2">
                {post.category && (
                  <span className="text-[11px] font-mono text-neon-cyan">{post.category.name}</span>
                )}
                <span className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                  <Clock className="w-3 h-3" />{post.readTimeMin} min
                </span>
                {post.publishedAt && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
              </div>
              <h3 className="font-display text-sm font-bold text-white group-hover:text-neon-cyan transition-colors">
                {post.title}
              </h3>
              <p className="text-xs text-text-muted font-mono mt-1.5 line-clamp-2">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
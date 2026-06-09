import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Edit2, Trash2, Eye, Clock, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Blog Manager" };

// In production: fetch from prisma.blogPost.findMany()
const MOCK_POSTS = [
  { id: "1", title: "How to Split a PDF Online for Free", slug: "how-to-split-pdf-online-free", status: "PUBLISHED", category: "PDF Tools", date: "2025-01-15", views: 1240 },
  { id: "2", title: "Compress Images Without Losing Quality", slug: "compress-images-without-losing-quality", status: "PUBLISHED", category: "Image Tools", date: "2025-01-12", views: 890 },
  { id: "3", title: "Word to PDF: The Complete 2025 Guide", slug: "word-to-pdf-conversion-guide", status: "DRAFT", category: "Text Tools", date: "2025-01-10", views: 0 },
];

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  PUBLISHED: { label: "Published", color: "#00ff88", bg: "rgba(0,255,136,0.08)" },
  DRAFT:     { label: "Draft",     color: "#ffcc00", bg: "rgba(255,204,0,0.08)" },
  SCHEDULED: { label: "Scheduled", color: "#00f5ff", bg: "rgba(0,245,255,0.08)" },
  ARCHIVED:  { label: "Archived",  color: "#475569", bg: "rgba(71,85,105,0.08)" },
};

export default function AdminBlogPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">BLOG MANAGER</h1>
          <p className="text-xs font-mono text-text-muted">{MOCK_POSTS.length} posts · Manage articles, drafts, and SEO</p>
        </div>
        <Link href="/admin/blog/new"
          className="btn-neon flex items-center gap-2 text-sm font-mono font-bold tracking-wider px-4 py-2.5">
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Posts table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,245,255,0.08)" }}>
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-neon-cyan/8 text-[10px] font-mono uppercase tracking-widest text-text-muted"
          style={{ background: "rgba(0,245,255,0.03)" }}>
          <div className="col-span-5">Title</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-1">Views</div>
          <div className="col-span-1">Date</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Rows */}
        {MOCK_POSTS.map((post, i) => {
          const st = STATUS_STYLES[post.status] ?? STATUS_STYLES.DRAFT;
          return (
            <div key={post.id}
              className="grid grid-cols-12 gap-4 px-5 py-4 border-b last:border-0 items-center hover:bg-neon-cyan/2 transition-colors"
              style={{ borderColor: "rgba(0,245,255,0.06)", background: i % 2 === 0 ? "rgba(10,15,30,0.6)" : "rgba(13,18,36,0.5)" }}>
              {/* Title */}
              <div className="col-span-5">
                <Link href={`/admin/blog/${post.id}`} className="text-sm font-mono text-text-primary hover:text-neon-cyan transition-colors line-clamp-1">
                  {post.title}
                </Link>
                <p className="text-[11px] font-mono text-text-muted mt-0.5">/blog/{post.slug}</p>
              </div>

              {/* Status */}
              <div className="col-span-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono"
                  style={{ background: st.bg, color: st.color }}>
                  {post.status === "PUBLISHED" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                  {st.label}
                </span>
              </div>

              {/* Category */}
              <div className="col-span-2">
                <span className="text-xs font-mono text-text-muted">{post.category}</span>
              </div>

              {/* Views */}
              <div className="col-span-1">
                <span className="text-xs font-mono text-text-muted">{post.views.toLocaleString()}</span>
              </div>

              {/* Date */}
              <div className="col-span-1">
                <span className="text-xs font-mono text-text-muted">{new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center justify-end gap-1.5">
                <Link href={`/blog/${post.slug}`} target="_blank"
                  className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan border border-transparent hover:border-neon-cyan/20 transition-all">
                  <Eye className="w-3.5 h-3.5" />
                </Link>
                <Link href={`/admin/blog/${post.id}`}
                  className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan border border-transparent hover:border-neon-cyan/20 transition-all">
                  <Edit2 className="w-3.5 h-3.5" />
                </Link>
                <button className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-red border border-transparent hover:border-neon-red/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

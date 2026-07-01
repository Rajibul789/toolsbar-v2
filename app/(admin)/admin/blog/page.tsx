"use client";

import type { Metadata } from "next";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Eye, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const metadata: Metadata = { title: "Blog Manager" };

interface AdminPost {
  id:          string;
  title:       string;
  slug:        string;
  status:      string;
  publishedAt: string | null;
  views:       number;
  category:    { name: string } | null;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  PUBLISHED: { label: "Published", color: "#00ff88", bg: "rgba(0,255,136,0.08)" },
  DRAFT:     { label: "Draft",     color: "#ffcc00", bg: "rgba(255,204,0,0.08)" },
  SCHEDULED: { label: "Scheduled", color: "#00f5ff", bg: "rgba(0,245,255,0.08)" },
  ARCHIVED:  { label: "Archived",  color: "#475569", bg: "rgba(71,85,105,0.08)" },
};

export default function AdminBlogPage() {
  const [posts,   setPosts]   = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { posts: AdminPost[]; total: number };
      // Handle both shapes: unwrapped array (legacy) or { posts, total } object
      setPosts(Array.isArray(data) ? data : (data.posts ?? []));
    } catch {
      toast.error("Could not load blog posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function deletePost(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setPosts((p) => p.filter((x) => x.id !== id));
      toast.success("Post deleted — public site updated.");
    } catch {
      toast.error("Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8 gap-3">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">BLOG MANAGER</h1>
          <p className="text-xs font-mono text-text-muted">
            {loading ? "Loading…" : `${posts.length} post${posts.length !== 1 ? "s" : ""} · Manage articles, drafts, and SEO`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-text-muted" />}
          <Link href="/admin/blog/new"
            className="btn-neon flex items-center gap-2 text-sm font-mono font-bold tracking-wider px-4 py-2.5">
            <Plus className="w-4 h-4" />New Post
          </Link>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,245,255,0.08)" }}>
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-neon-cyan/8 text-[10px] font-mono uppercase tracking-widest text-text-muted"
          style={{ background: "rgba(0,245,255,0.03)" }}>
          <div className="col-span-5">Title</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Empty / loading state */}
        {!loading && posts.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-mono text-text-muted">No posts yet.</p>
            <Link href="/admin/blog/new" className="btn-neon inline-flex mt-4 text-sm items-center gap-2">
              <Plus className="w-4 h-4" />Write your first post
            </Link>
          </div>
        )}

        {/* Rows */}
        {posts.map((post, i) => {
          const st = STATUS_STYLES[post.status] ?? STATUS_STYLES.DRAFT;
          const isBusy = deleting === post.id;
          return (
            <div key={post.id}
              className="grid grid-cols-12 gap-4 px-5 py-4 border-b last:border-0 items-center hover:bg-neon-cyan/2 transition-colors"
              style={{
                borderColor: "rgba(0,245,255,0.06)",
                background: i % 2 === 0 ? "rgba(10,15,30,0.6)" : "rgba(13,18,36,0.5)",
                opacity: isBusy ? 0.6 : 1,
              }}>
              {/* Title */}
              <div className="col-span-5 min-w-0">
                <Link href={`/admin/blog/${post.id}`} className="text-sm font-mono text-text-primary hover:text-neon-cyan transition-colors line-clamp-1">
                  {post.title}
                </Link>
                <p className="text-[11px] font-mono text-text-muted mt-0.5 truncate">/blog/{post.slug}</p>
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
                <span className="text-xs font-mono text-text-muted">{post.category?.name ?? "—"}</span>
              </div>

              {/* Date */}
              <div className="col-span-2">
                <span className="text-xs font-mono text-text-muted">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
                    : "—"}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center justify-end gap-1.5">
                {post.status === "PUBLISHED" && (
                  <Link href={`/blog/${post.slug}`} target="_blank"
                    className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan border border-transparent hover:border-neon-cyan/20 transition-all">
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                )}
                <Link href={`/admin/blog/${post.id}`}
                  className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan border border-transparent hover:border-neon-cyan/20 transition-all">
                  <Edit2 className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => deletePost(post.id, post.title)}
                  disabled={isBusy}
                  className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-red border border-transparent hover:border-neon-red/20 transition-all disabled:cursor-wait">
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
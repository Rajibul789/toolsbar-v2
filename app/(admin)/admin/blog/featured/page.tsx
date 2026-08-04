"use client";
import { useState, useEffect } from "react";
import { Star, X, ArrowUp, ArrowDown, Plus } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Post {
  id: string; title: string; slug: string; excerpt: string; status: string;
  featuredImage: string | null; publishedAt: string | null;
  category: { name: string; slug: string } | null;
}

export default function FeaturedBlogPage() {
  const [featured, setFeatured]   = useState<Post[]>([]);
  const [available, setAvailable] = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog/featured");
      if (!res.ok) throw new Error();
      const data = await res.json() as { featured: Post[]; available: Post[] };
      setFeatured(data.featured);
      setAvailable(data.available);
    } catch {
      toast.error("Failed to load featured posts.");
    } finally {
      setLoading(false);
    }
  }

  async function persist(next: Post[]) {
    setFeatured(next);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/blog/featured", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: next.map((p) => p.slug) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Featured posts updated — visible on the blog now.");
    } catch {
      toast.error("Failed to save — reloading current state.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  function move(slug: string, dir: "up" | "down") {
    const idx = featured.findIndex((p) => p.slug === slug);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= featured.length) return;
    const next = [...featured];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    void persist(next);
  }

  function remove(slug: string) {
    void persist(featured.filter((p) => p.slug !== slug));
  }

  function add(post: Post) {
    setShowPicker(false);
    void persist([...featured, post]);
  }

  const featuredSlugs = new Set(featured.map((p) => p.slug));
  const pickable = available.filter((p) => !featuredSlugs.has(p.slug));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">FEATURED BLOG POSTS</h1>
          <p className="text-xs font-mono text-text-muted">Control which posts are highlighted on the blog listing page</p>
        </div>
        <Link href="/admin/blog/new" className="btn-neon flex items-center gap-2 text-sm font-mono font-bold px-4 py-2.5">
          <Plus className="w-4 h-4" />New Post
        </Link>
      </div>

      <div className="rounded-xl px-5 py-4 mb-6" style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.1)" }}>
        <p className="text-xs font-mono text-text-muted"><span className="text-neon-cyan">ℹ</span>{" "}
          Featured posts appear at the top of the blog with a FEATURED badge. Reorder with arrows; only published posts can be featured.
        </p>
      </div>

      {loading ? (
        <p className="text-xs font-mono text-text-muted">Loading…</p>
      ) : (
        <div className="space-y-2 max-w-3xl">
          <AnimatePresence>
            {featured.map((item, i) => (
              <motion.div key={item.slug} layout
                className="flex items-center gap-4 px-5 py-4 rounded-xl"
                style={{ background: "rgba(10,15,30,0.8)", border: "1px solid rgba(0,245,255,0.12)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
                  style={{ background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.15)", color: "#00f5ff" }}>
                  {i + 1}
                </div>
                <Star className="w-4 h-4 flex-shrink-0 text-neon-yellow" style={{ fill: "#ffcc00" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-text-primary truncate">{item.title}</p>
                  <p className="text-[11px] font-mono text-text-muted">
                    {item.category?.name ?? "Uncategorized"}
                    {item.publishedAt && ` · ${new Date(item.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => move(item.slug, "up")} disabled={saving || i === 0}
                    className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan transition-all disabled:opacity-30">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => move(item.slug, "down")} disabled={saving || i === featured.length - 1}
                    className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan transition-all disabled:opacity-30">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(item.slug)} disabled={saving}
                    className="w-7 h-7 rounded flex items-center justify-center transition-all text-neon-red/60 hover:text-neon-red"
                    style={{ background: "rgba(255,0,60,0.06)", border: "1px solid rgba(255,0,60,0.15)" }}
                    title="Remove from featured">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <Link href={`/admin/blog/${item.id}`} className="px-3 py-1.5 text-[11px] font-mono rounded border border-neon-cyan/15 text-text-muted hover:text-neon-cyan transition-all">
                    Edit
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {featured.length === 0 && (
            <p className="text-xs font-mono text-text-muted py-6 text-center">No featured posts yet — add one below.</p>
          )}

          {/* Add post */}
          <div className="pt-2">
            {showPicker ? (
              <div className="rounded-xl p-4" style={{ background: "rgba(10,15,30,0.8)", border: "1px solid rgba(0,245,255,0.1)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-mono text-text-muted uppercase tracking-wider">Select a published post</p>
                  <button onClick={() => setShowPicker(false)} className="text-text-muted hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                {pickable.length === 0 ? (
                  <p className="text-xs font-mono text-text-muted">
                    No more published posts to feature — <Link href="/admin/blog/new" className="text-neon-cyan hover:underline">write one</Link>.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {pickable.map((p) => (
                      <button key={p.slug} onClick={() => add(p)}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono text-text-primary hover:text-neon-cyan transition-colors"
                        style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.06)" }}>
                        {p.title} <span className="text-text-muted">· {p.category?.name ?? "Uncategorized"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowPicker(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-mono text-text-muted hover:text-neon-cyan transition-all"
                style={{ background: "rgba(0,245,255,0.02)", border: "1px dashed rgba(0,245,255,0.15)" }}>
                <Plus className="w-3.5 h-3.5" />Add a post to Featured
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

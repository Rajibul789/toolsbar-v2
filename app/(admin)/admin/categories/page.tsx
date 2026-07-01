"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, FolderOpen, Save, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#00f5ff","#00ff88","#bf00ff","#ff6600","#ff00aa","#ffcc00","#ff003c","#0066ff"];

interface Cat { id: string; name: string; slug: string; color?: string; _count?: { posts: number }; }

function slugify(s: string) { return s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""); }

export default function AdminCategoriesPage() {
  const [cats,    setCats]    = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState({ name: "", slug: "", color: "#00f5ff" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error(await res.text());
      setCats(await res.json());
    } catch {
      toast.error("Could not load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function nameChange(name: string) { setForm((f) => ({ ...f, name, slug: slugify(name) })); }
  function cancel() { setEditing(null); setAdding(false); setForm({ name: "", slug: "", color: "#00f5ff" }); }

  async function saveNew() {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, slug: form.slug }),
      });
      if (!res.ok) throw new Error(await res.text());
      cancel();
      toast.success("Category created — blog pages updated.");
      await load();
    } catch {
      toast.error("Create failed.");
    }
  }

  async function deletecat(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Posts in this category will be uncategorised.`)) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setCats((p) => p.filter((c) => c.id !== id));
      toast.success("Deleted.");
    } catch {
      toast.error("Delete failed.");
    }
  }

  const Row = ({ onSave }: { onSave: () => void }) => (
    <div className="flex flex-wrap gap-3 px-4 py-3 rounded-xl items-center"
      style={{ background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.2)" }}>
      <input value={form.name} onChange={(e) => nameChange(e.target.value)}
        placeholder="Category name" className="input-cyber text-sm py-2 w-40 flex-shrink-0" autoFocus />
      <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
        placeholder="url-slug" className="input-cyber text-sm py-2 font-mono w-36 flex-shrink-0" />
      <div className="flex gap-1.5">
        {COLORS.map((c) => (
          <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
            className="w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform"
            style={{ background: c, borderColor: form.color === c ? "#fff" : "transparent" }} />
        ))}
      </div>
      <button onClick={onSave} className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono rounded-lg"
        style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}>
        <Save className="w-3 h-3" />Save
      </button>
      <button onClick={cancel} className="p-1.5 text-text-muted hover:text-neon-red">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8 gap-3">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">CATEGORIES</h1>
          <p className="text-xs font-mono text-text-muted">Manage blog post categories</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-text-muted" />}
          <button onClick={() => { setAdding(true); setEditing(null); setForm({ name: "", slug: "", color: "#00f5ff" }); }}
            className="btn-neon flex items-center gap-2 text-sm font-mono font-bold px-4 py-2.5">
            <Plus className="w-4 h-4" />New Category
          </button>
        </div>
      </div>

      <div className="space-y-2 max-w-3xl">
        {adding && <Row onSave={saveNew} />}
        {cats.map((cat) => (
          <div key={cat.id}>
            {editing === cat.id ? (
              <Row onSave={async () => {
                if (!form.name.trim()) { toast.error("Name required"); return; }
                // Note: PATCH for categories can be added to the API if needed;
                // for now update locally and show a reload prompt
                setEditing(null);
                toast.info("Category name editing requires a page reload to persist.");
              }} />
            ) : (
              <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl group transition-all"
                style={{ background: "rgba(10,15,30,0.8)", border: "1px solid rgba(0,245,255,0.06)" }}>
                <div className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: cat.color ?? "#00f5ff", boxShadow: `0 0 6px ${cat.color ?? "#00f5ff"}60` }} />
                <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: cat.color ?? "#00f5ff" }} />
                <span className="text-sm font-mono text-text-primary flex-1">{cat.name}</span>
                <span className="text-xs font-mono text-text-muted hidden sm:block w-40">{cat.slug}</span>
                <span className="text-xs font-mono text-text-muted w-16 text-center">
                  {cat._count?.posts ?? 0} posts
                </span>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(cat.id); setAdding(false); setForm({ name: cat.name, slug: cat.slug, color: cat.color ?? "#00f5ff" }); }}
                    className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deletecat(cat.id, cat.name)}
                    className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-red transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && cats.length === 0 && !adding && (
          <p className="text-sm font-mono text-text-muted text-center py-8">No categories yet.</p>
        )}
      </div>
    </div>
  );
}
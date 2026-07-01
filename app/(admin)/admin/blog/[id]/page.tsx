"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Save, Eye, ArrowLeft, Trash2, RefreshCw, CheckCircle2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { TOOLS_CONFIG } from "@/config/tools.config";
import { slugify } from "@/lib/utils";
import Link from "next/link";

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((m) => m.default),
  { ssr: false, loading: () => <div className="h-64 rounded-lg animate-pulse" style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.1)" }} /> }
);

const schema = z.object({
  title:           z.string().min(5,  "Title must be at least 5 characters"),
  slug:            z.string().min(3,  "Slug must be at least 3 characters"),
  excerpt:         z.string().min(20, "Excerpt must be at least 20 characters"),
  categoryId:      z.string().min(1,  "Category is required"),
  status:          z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]),
  seoTitle:        z.string().optional(),
  seoDesc:         z.string().optional(),
  seoKeywords:     z.string().optional(),
  relatedToolSlug: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const BLOG_CATEGORIES = ["PDF Tools","Image Tools","Text Tools","Social Tools","Developer Tools","Tutorials","News"];

const STATUS_INFO: Record<string, { label: string; color: string; icon: string }> = {
  PUBLISHED: { label: "Published — visible publicly", color: "#00ff88", icon: "🟢" },
  DRAFT:     { label: "Draft — hidden from public",   color: "#ffcc00", icon: "🟡" },
  SCHEDULED: { label: "Scheduled — will publish soon",color: "#00f5ff", icon: "🔵" },
  ARCHIVED:  { label: "Archived — hidden from public",color: "#475569", icon: "⚫" },
};

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const id     = params.id as string;

  const [content,   setContent]   = useState("");
  const [loading,   setLoading]   = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);
  const [isDeleting,setIsDeleting]= useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("DRAFT");

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "DRAFT" },
  });

  const watchedStatus = watch("status");

  // ── Load real post data from DB on mount ───────────────────────────────────
  // Root-cause fix: the previous implementation used hardcoded defaultValues
  // (status:"DRAFT", title:"Post {id}"). Opening any published post and saving
  // without changing the status dropdown would silently overwrite it to DRAFT.
  useEffect(() => {
    async function loadPost() {
      try {
        const res = await fetch(`/api/admin/blog/${id}`);
        if (!res.ok) {
          toast.error("Post not found.");
          router.push("/admin/blog");
          return;
        }
        const post = await res.json() as {
          id: string; title: string; slug: string; excerpt: string;
          content: string; status: string;
          categoryId: string; category?: { slug: string };
          seoTitle?: string; seoDesc?: string; seoKeywords?: string;
          relatedToolSlug?: string;
        };

        // Populate the markdown editor
        setContent(post.content);
        setCurrentStatus(post.status);

        // Populate all react-hook-form fields with actual DB values
        reset({
          title:           post.title,
          slug:            post.slug,
          excerpt:         post.excerpt,
          categoryId:      post.category?.slug ?? post.categoryId,
          status:          post.status as FormData["status"],
          seoTitle:        post.seoTitle ?? "",
          seoDesc:         post.seoDesc ?? "",
          seoKeywords:     post.seoKeywords ?? "",
          relatedToolSlug: post.relatedToolSlug ?? "",
        });
      } catch {
        toast.error("Failed to load post.");
      } finally {
        setLoading(false);
      }
    }
    void loadPost();
  }, [id, router, reset]);

  function handleTitleChange(value: string) {
    setValue("title", value, { shouldDirty: true });
    setValue("slug",  slugify(value), { shouldDirty: true });
  }

  async function onSubmit(data: FormData) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error ?? "Save failed");
      }

      const saved = await res.json() as { status: string };
      setCurrentStatus(saved.status);
      // Mark form as "not dirty" after successful save. `content` is tracked
      // via separate useState (the MDEditor), not part of the react-hook-form
      // schema, so it must not be included in the reset payload.
      reset(data, { keepValues: true });

      const msgs: Record<string, string> = {
        PUBLISHED: "✅ Post published — now visible publicly",
        DRAFT:     "💾 Draft saved — hidden from public",
        ARCHIVED:  "📦 Post archived — hidden from public",
        SCHEDULED: "📅 Post scheduled",
      };
      toast.success(msgs[data.status] ?? "Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save post.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this post permanently? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Post deleted — removed from public site.");
      router.push("/admin/blog");
    } catch {
      toast.error("Failed to delete post.");
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-64">
        <div className="flex items-center gap-3 text-text-muted font-mono text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading post…
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_INFO[watchedStatus] ?? STATUS_INFO.DRAFT;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-lg border border-neon-cyan/15 flex items-center justify-center text-text-muted hover:text-neon-cyan transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-lg font-black text-white tracking-widest">EDIT POST</h1>
            <p className="text-[11px] font-mono" style={{ color: statusInfo.color }}>
              {statusInfo.icon} {statusInfo.label}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Live preview (only for published posts) */}
          {currentStatus === "PUBLISHED" && (
            <Link href={`/blog/${watch("slug")}`} target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-neon-cyan/15 rounded-lg text-text-muted hover:text-neon-cyan transition-all">
              <Eye className="w-3.5 h-3.5" />View Live
            </Link>
          )}

          {/* Status selector */}
          <select {...register("status")}
            className="input-cyber text-xs px-3 py-2 rounded-lg"
            style={{ color: statusInfo.color }}>
            <option value="DRAFT">Draft (hidden)</option>
            <option value="PUBLISHED">Published (live)</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ARCHIVED">Archived (hidden)</option>
          </select>

          {/* Save */}
          <button type="button" onClick={handleSubmit(onSubmit)} disabled={isSaving}
            className="btn-neon-green flex items-center gap-2 text-sm font-mono font-bold px-4 py-2 disabled:opacity-50">
            {isSaving
              ? <motion.div className="w-4 h-4 border-2 border-neon-green border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
              : isDirty ? <Save className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />
            }
            {isSaving ? "Saving…" : isDirty ? "Save Changes" : "Saved"}
          </button>

          {/* Delete */}
          <button type="button" onClick={handleDelete} disabled={isDeleting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-neon-red/25 rounded-lg text-neon-red/60 hover:text-neon-red hover:border-neon-red/40 transition-all disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" />{isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Status change warning */}
      {watchedStatus === "DRAFT" && currentStatus === "PUBLISHED" && (
        <div className="rounded-xl px-5 py-3 mb-6 flex items-center gap-3"
          style={{ background: "rgba(255,204,0,0.06)", border: "1px solid rgba(255,204,0,0.2)" }}>
          <span className="text-neon-yellow text-sm">⚠️</span>
          <p className="text-xs font-mono text-neon-yellow">
            You&apos;re reverting a published post to Draft. Saving will remove it from the public site immediately.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <input type="text" placeholder="Article title"
              value={watch("title") ?? ""}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="input-cyber w-full text-lg font-mono py-4" />
            {errors.title && <p className="text-[11px] font-mono text-neon-red mt-1">{errors.title.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-muted flex-shrink-0">/blog/</span>
            <input {...register("slug")} className="input-cyber flex-1 text-xs py-2" />
          </div>
          <div data-color-mode="dark">
            <MDEditor value={content} onChange={(v) => setContent(v ?? "")} height={500}
              style={{ background: "rgba(10,15,30,0.9)", borderRadius: 12, border: "1px solid rgba(0,245,255,0.1)" }} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="glass-panel p-5">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-3">Excerpt</label>
            <textarea {...register("excerpt")} rows={4}
              placeholder="Brief summary shown in blog listings..."
              className="input-cyber w-full resize-none text-sm" />
            {errors.excerpt && <p className="text-[11px] font-mono text-neon-red mt-1">{errors.excerpt.message}</p>}
          </div>

          <div className="glass-panel p-5">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-3">Category</label>
            <select {...register("categoryId")} className="input-cyber w-full text-sm">
              <option value="">Select category</option>
              {BLOG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat.toLowerCase().replace(/\s+/g, "-")}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="glass-panel p-5 space-y-4">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block">SEO</label>
            <input {...register("seoTitle")} placeholder="SEO title (50–60 chars)" className="input-cyber w-full text-sm" />
            <input {...register("seoDesc")}  placeholder="Meta description (150–160 chars)" className="input-cyber w-full text-sm" />
            <input {...register("seoKeywords")} placeholder="keyword1, keyword2, keyword3" className="input-cyber w-full text-sm" />
            <select {...register("relatedToolSlug")} className="input-cyber w-full text-sm">
              <option value="">— No tool link —</option>
              {TOOLS_CONFIG.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
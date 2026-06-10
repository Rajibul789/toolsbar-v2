"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Save, Eye, ArrowLeft, Trash2 } from "lucide-react";
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
  title:          z.string().min(10),
  slug:           z.string().min(3),
  excerpt:        z.string().min(20),
  categoryId:     z.string().min(1),
  status:         z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]),
  seoTitle:       z.string().optional(),
  seoDesc:        z.string().optional(),
  relatedToolSlug:z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const BLOG_CATEGORIES = ["PDF Tools","Image Tools","Text Tools","Social Tools","Developer Tools","Tutorials","News"];

export default function EditBlogPostPage() {
  const router  = useRouter();
  const params  = useParams();
  const id      = params.id as string;

  // In production: fetch post from DB by id
  // For now: show an edit form pre-filled with placeholder data
  const [content, setContent] = useState(`## Introduction\n\nEdit your article content here using Markdown...\n`);
  const [isSaving, setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "DRAFT", title: `Post ${id}`, slug: `post-${id}`, excerpt: "", categoryId: "" },
  });

  function handleTitleChange(value: string) {
    setValue("title", value);
    setValue("slug", slugify(value));
  }

  async function onSubmit(data: FormData) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, content }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success(data.status === "PUBLISHED" ? "Post published!" : "Draft saved!");
      router.push("/admin/blog");
    } catch {
      toast.error("Failed to save post.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure? This action cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      toast.success("Post deleted");
      router.push("/admin/blog");
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-lg border border-neon-cyan/15 flex items-center justify-center text-text-muted hover:text-neon-cyan transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-lg font-black text-white tracking-widest">EDIT POST</h1>
            <p className="text-[11px] font-mono text-text-muted">ID: {id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/blog/preview`} target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-neon-cyan/15 rounded-lg text-text-muted hover:text-neon-cyan transition-all">
            <Eye className="w-3.5 h-3.5" />Preview
          </Link>
          <select {...register("status")} className="input-cyber text-xs px-3 py-2 rounded-lg">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="SCHEDULED">Scheduled</option>
          </select>
          <button type="button" onClick={handleSubmit(onSubmit)} disabled={isSaving}
            className="btn-neon-green flex items-center gap-2 text-sm font-mono font-bold px-4 py-2 disabled:opacity-50">
            {isSaving
              ? <><motion.div className="w-4 h-4 border-2 border-neon-green border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />Saving…</>
              : <><Save className="w-4 h-4" />Save Post</>
            }
          </button>
          <button type="button" onClick={handleDelete} disabled={isDeleting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-neon-red/25 rounded-lg text-neon-red/60 hover:text-neon-red hover:border-neon-red/40 transition-all disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" />{isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <input type="text" placeholder="Article title" defaultValue={`Post ${id}`}
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
              placeholder="Brief summary shown in blog listings..." className="input-cyber w-full resize-none text-sm" />
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
            <input {...register("seoTitle")} placeholder="SEO title (50-60 chars)" className="input-cyber w-full text-sm" />
            <input {...register("seoDesc")} placeholder="Meta description (150-160 chars)" className="input-cyber w-full text-sm" />
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
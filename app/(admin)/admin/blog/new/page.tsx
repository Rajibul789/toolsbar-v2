"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Save, Eye, ArrowLeft, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { TOOLS_CONFIG } from "@/config/tools.config";
import { slugify } from "@/lib/utils";

const MDEditor = dynamic(() => import("@uiw/react-md-editor").then((m) => m.default), {
  ssr: false,
  loading: () => <div className="h-64 rounded-lg animate-pulse" style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.1)" }} />,
});

const schema = z.object({
  title:       z.string().min(10, "Title must be at least 10 characters"),
  slug:        z.string().min(3),
  excerpt:     z.string().min(50, "Excerpt must be at least 50 characters"),
  categoryId:  z.string().min(1, "Select a category"),
  status:      z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]),
  seoTitle:    z.string().optional(),
  seoDesc:     z.string().optional(),
  seoKeywords: z.string().optional(),
  relatedToolSlug: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const BLOG_CATEGORIES = ["PDF Tools", "Image Tools", "Text Tools", "Social Tools", "Developer Tools", "Tutorials", "News"];

interface FaqItem { question: string; answer: string; }

export default function NewBlogPostPage() {
  const router = useRouter();
  const [content, setContent] = useState("## Introduction\n\nStart writing your article here...\n\n## Section 1\n\nAdd your content.\n");
  const [activeTab, setActiveTab] = useState<"content" | "seo" | "faq">("content");
  const [faqItems, setFaqItems] = useState<FaqItem[]>([{ question: "", answer: "" }]);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "DRAFT" },
  });

  const title = watch("title");

  function handleTitleChange(value: string) {
    setValue("title", value);
    setValue("slug", slugify(value));
  }

  function addFaqItem() {
    setFaqItems((p) => [...p, { question: "", answer: "" }]);
  }

  function removeFaqItem(i: number) {
    setFaqItems((p) => p.filter((_, idx) => idx !== i));
  }

  function updateFaq(i: number, field: "question" | "answer", value: string) {
    setFaqItems((p) => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  async function onSubmit(data: FormData) {
    if (!content.trim() || content.length < 100) {
      toast.error("Content is too short. Write at least 100 characters.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...data,
        content,
        faqSchema: faqItems.filter((f) => f.question && f.answer).length > 0
          ? { items: faqItems.filter((f) => f.question && f.answer) }
          : undefined,
      };

      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(data.status === "PUBLISHED" ? "Post published!" : "Draft saved!");
      router.push("/admin/blog");
    } catch {
      toast.error("Failed to save post. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const TABS = [
    { id: "content", label: "Content" },
    { id: "seo",     label: "SEO" },
    { id: "faq",     label: `FAQ (${faqItems.length})` },
  ] as const;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg border border-neon-cyan/15 flex items-center justify-center text-text-muted hover:text-neon-cyan transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-lg font-black text-white tracking-widest">NEW BLOG POST</h1>
            <p className="text-[11px] font-mono text-text-muted">Create and publish an article</p>
          </div>
        </div>

        <div className="flex gap-2">
          <select {...register("status")} className="input-cyber text-xs px-3 py-2 rounded-lg">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Publish Now</option>
            <option value="SCHEDULED">Schedule</option>
          </select>
          <button type="button" onClick={handleSubmit(onSubmit)} disabled={isSaving}
            className="btn-neon-green flex items-center gap-2 text-sm font-mono font-bold tracking-wider px-4 py-2 disabled:opacity-50">
            {isSaving ? <motion.div className="w-4 h-4 border-2 border-neon-green border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving…" : "Save Post"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div>
            <input
              type="text"
              placeholder="Article title — make it clear and keyword-rich"
              onChange={(e) => handleTitleChange(e.target.value)}
              className="input-cyber w-full text-lg font-mono py-4"
            />
            {errors.title && <p className="text-[11px] font-mono text-neon-red mt-1">{errors.title.message}</p>}
          </div>

          {/* Slug */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-muted flex-shrink-0">/blog/</span>
            <input {...register("slug")} placeholder="url-slug-auto-generated" className="input-cyber flex-1 text-xs py-2" />
          </div>

          {/* Tabs */}
          <div className="border-b border-neon-cyan/8">
            <div className="flex gap-0">
              {TABS.map(({ id, label }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className="px-4 py-2.5 text-xs font-mono border-b-2 transition-all"
                  style={{
                    borderColor: activeTab === id ? "var(--neon-cyan)" : "transparent",
                    color: activeTab === id ? "#00f5ff" : "#475569",
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content tab */}
          {activeTab === "content" && (
            <div data-color-mode="dark">
              <MDEditor value={content} onChange={(v) => setContent(v ?? "")} height={500}
                style={{ background: "rgba(10,15,30,0.9)", borderRadius: 12, border: "1px solid rgba(0,245,255,0.1)" }} />
            </div>
          )}

          {/* SEO tab */}
          {activeTab === "seo" && (
            <div className="space-y-4 glass-panel p-6">
              <div>
                <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">SEO Title (50–60 chars)</label>
                <input {...register("seoTitle")} placeholder="Leave blank to use article title" className="input-cyber w-full" />
                <p className="text-[11px] font-mono text-text-muted mt-1">
                  {(watch("seoTitle") ?? title ?? "").length}/60 characters
                </p>
              </div>
              <div>
                <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Meta Description (150–160 chars)</label>
                <textarea {...register("seoDesc")} rows={3} placeholder="Brief description for search engines and social sharing..." className="input-cyber w-full resize-none" />
                <p className="text-[11px] font-mono text-text-muted mt-1">{(watch("seoDesc") ?? "").length}/160 characters</p>
              </div>
              <div>
                <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Keywords (comma-separated)</label>
                <input {...register("seoKeywords")} placeholder="pdf split, split pdf online, extract pdf pages" className="input-cyber w-full" />
              </div>
              <div>
                <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Link to Tool (optional)</label>
                <select {...register("relatedToolSlug")} className="input-cyber w-full">
                  <option value="">— No tool link —</option>
                  {TOOLS_CONFIG.map((t) => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* FAQ tab */}
          {activeTab === "faq" && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-text-muted">
                FAQ items appear at the bottom of the article and generate JSON-LD schema markup for SEO.
              </p>
              {faqItems.map((item, i) => (
                <div key={i} className="glass-panel p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neon-cyan">Q{i + 1}</span>
                    <button onClick={() => removeFaqItem(i)} className="text-text-muted hover:text-neon-red transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input type="text" value={item.question} onChange={(e) => updateFaq(i, "question", e.target.value)}
                    placeholder="Question..." className="input-cyber w-full text-sm" />
                  <textarea value={item.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)}
                    placeholder="Answer..." rows={3} className="input-cyber w-full text-sm resize-none" />
                </div>
              ))}
              <button onClick={addFaqItem}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neon-cyan/15 text-xs font-mono text-text-muted hover:text-neon-cyan hover:border-neon-cyan/35 transition-all w-full justify-center">
                <Plus className="w-3.5 h-3.5" />
                Add FAQ Item
              </button>
            </div>
          )}
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-5">
          {/* Excerpt */}
          <div className="glass-panel p-5">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-3">Excerpt</label>
            <textarea {...register("excerpt")} rows={4} placeholder="Brief summary shown in blog listings..." className="input-cyber w-full resize-none text-sm" />
            {errors.excerpt && <p className="text-[11px] font-mono text-neon-red mt-1">{errors.excerpt.message}</p>}
          </div>

          {/* Category */}
          <div className="glass-panel p-5">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-3">Category</label>
            <select {...register("categoryId")} className="input-cyber w-full text-sm">
              <option value="">Select category</option>
              {BLOG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat.toLowerCase().replace(/\s+/g, "-")}>{cat}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-[11px] font-mono text-neon-red mt-1">{errors.categoryId.message}</p>}
          </div>

          {/* Featured image */}
          <div className="glass-panel p-5">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-3">Featured Image</label>
            <div className="rounded-xl border-2 border-dashed border-neon-cyan/15 p-6 text-center hover:border-neon-cyan/30 transition-colors cursor-pointer">
              <ImageIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-xs font-mono text-text-muted">Upload image or paste URL</p>
              <p className="text-[10px] font-mono text-text-muted/60 mt-1">Recommended: 1200×630px</p>
            </div>
          </div>

          {/* Checklist */}
          <div className="glass-panel p-5">
            <p className="text-xs font-mono text-neon-cyan/70 uppercase tracking-widest mb-3">Pre-publish Checklist</p>
            {[
              "Title is 50–60 characters",
              "Excerpt written (50+ chars)",
              "Meta description filled",
              "Category selected",
              "Content is 800+ words",
              "At least 1 FAQ item added",
              "Related tool linked (optional)",
            ].map((item) => (
              <label key={item} className="flex items-center gap-2 text-xs font-mono text-text-muted mb-2 cursor-pointer">
                <input type="checkbox" className="rounded" style={{ accentColor: "#00f5ff" }} />
                {item}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

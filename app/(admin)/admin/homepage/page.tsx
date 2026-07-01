"use client";

import { useState, useEffect } from "react";
import { Globe, Star, Eye, EyeOff, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

interface FeaturedSlide {
  id:       string;
  headline: string;
  isActive: boolean;
  order:    number;
  tool:     { slug: string; name: string };
}

interface HomepageConfig { key: string; value: string; }

const SECTIONS = [
  { key: "show_hero",           label: "Hero Section",           desc: "Full-screen hero with search" },
  { key: "show_featured",       label: "Featured Tools Slider",  desc: "Netflix-style featured carousel" },
  { key: "show_tools_grid",     label: "Tools Grid",             desc: "All tools by category" },
  { key: "show_recently_used",  label: "Recently Used Section",  desc: "Client-side recent tools" },
  { key: "show_why_us",         label: "Why Choose Us",          desc: "Feature highlights section" },
  { key: "show_faq",            label: "FAQ Section",            desc: "Expandable FAQ accordion" },
  { key: "show_blog_preview",   label: "Blog Preview",           desc: "Latest 3 blog posts" },
];

export default function AdminHomepagePage() {
  const [slides,   setSlides]   = useState<FeaturedSlide[]>([]);
  const [configs,  setConfigs]  = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [headline, setHeadline] = useState("FREE ONLINE TOOLS");
  const [typewriterLines, setTypewriterLines] = useState(
    "Split PDFs in seconds.\nCompress images instantly.\nConvert documents freely.\nAll in your browser.\nNo uploads. No limits."
  );

  useEffect(() => {
    async function load() {
      try {
        // Load homepage config (hero content + section visibility)
        const cfgRes = await fetch("/api/admin/homepage");
        if (cfgRes.ok) {
          const rows = await cfgRes.json() as HomepageConfig[];
          const map: Record<string, string> = {};
          for (const r of rows) map[r.key] = r.value;
          setConfigs(map);
          if (map.hero_headline)    setHeadline(map.hero_headline);
          if (map.hero_typewriter)  setTypewriterLines(map.hero_typewriter);
        }

        // Load featured slides from tools API
        const toolsRes = await fetch("/api/admin/tools");
        if (toolsRes.ok) {
          const tools = await toolsRes.json() as Array<{
            slug: string; name: string; isFeatured: boolean;
            featuredSlide?: { id: string; headline: string; isActive: boolean; order: number };
          }>;
          const featured = tools
            .filter((t) => t.isFeatured)
            .map((t, i) => ({
              id:       t.featuredSlide?.id ?? t.slug,
              headline: t.featuredSlide?.headline ?? t.name.toUpperCase(),
              isActive: t.featuredSlide?.isActive ?? true,
              order:    t.featuredSlide?.order ?? i,
              tool:     { slug: t.slug, name: t.name },
            }));
          setSlides(featured);
        }
      } catch {
        toast.error("Could not load homepage settings.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function sectionVisible(key: string) {
    if (key in configs) return configs[key] === "true";
    return true; // default all sections visible
  }

  function toggleSection(key: string) {
    setConfigs((p) => ({ ...p, [key]: String(!sectionVisible(key)) }));
  }

  async function saveHeroContent() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { key: "hero_headline",   value: headline },
          { key: "hero_typewriter", value: typewriterLines },
          ...SECTIONS.map((s) => ({ key: s.key, value: String(sectionVisible(s.key)) })),
        ]),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Homepage settings saved — public site updated.");
    } catch {
      toast.error("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">HOMEPAGE BUILDER</h1>
          <p className="text-xs font-mono text-text-muted">
            Control featured tools slider, hero content, and section visibility.
          </p>
        </div>
        {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-text-muted" />}
      </div>

      {/* Featured tools slider */}
      <div className="mb-8">
        <h2 className="font-display text-sm font-bold text-neon-cyan tracking-widest mb-4 flex items-center gap-2">
          <Star className="w-4 h-4" />FEATURED TOOLS SLIDER
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,245,255,0.1)" }}>
          <div className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-text-muted grid grid-cols-6 gap-4"
            style={{ background: "rgba(0,245,255,0.03)", borderBottom: "1px solid rgba(0,245,255,0.06)" }}>
            <div className="col-span-3">Tool</div>
            <div>Headline</div>
            <div>Order</div>
            <div className="text-right">Active</div>
          </div>

          {!loading && slides.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-mono text-text-muted">
                No featured tools yet. Go to{" "}
                <a href="/admin/tools" className="text-neon-cyan hover:underline">Tool Manager</a>{" "}
                and mark tools as featured using the ⭐ button.
              </p>
            </div>
          ) : (
            slides.map((slide, i) => (
              <div key={slide.id}
                className="grid grid-cols-6 gap-4 px-5 py-3.5 items-center border-b last:border-0"
                style={{ borderColor: "rgba(0,245,255,0.06)", background: i % 2 === 0 ? "rgba(10,15,30,0.6)" : "rgba(13,18,36,0.5)" }}>
                <div className="col-span-3 text-sm font-mono text-text-primary">{slide.tool.name}</div>
                <div className="text-xs font-mono text-text-muted italic">{slide.headline}</div>
                <div className="text-xs font-mono text-neon-cyan">{slide.order + 1}</div>
                <div className="flex justify-end">
                  <div className="w-7 h-7 rounded flex items-center justify-center"
                    style={{ background: slide.isActive ? "rgba(0,255,136,0.1)" : "rgba(71,85,105,0.1)", border: `1px solid ${slide.isActive ? "rgba(0,255,136,0.25)" : "rgba(71,85,105,0.2)"}` }}>
                    {slide.isActive ? <Eye className="w-3.5 h-3.5 text-neon-green" /> : <EyeOff className="w-3.5 h-3.5 text-text-muted" />}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section visibility */}
      <div className="mb-8">
        <h2 className="font-display text-sm font-bold text-neon-cyan tracking-widest mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" />SECTION VISIBILITY
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map(({ key, label, desc }) => {
            const visible = sectionVisible(key);
            return (
              <div key={key} className="flex items-center justify-between rounded-xl px-4 py-3.5"
                style={{ background: "rgba(10,15,30,0.8)", border: "1px solid rgba(0,245,255,0.08)" }}>
                <div>
                  <p className="text-xs font-mono font-semibold text-text-primary">{label}</p>
                  <p className="text-[11px] font-mono text-text-muted">{desc}</p>
                </div>
                <button onClick={() => toggleSection(key)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: visible ? "rgba(0,255,136,0.1)" : "rgba(71,85,105,0.1)", border: `1px solid ${visible ? "rgba(0,255,136,0.25)" : "rgba(71,85,105,0.2)"}` }}>
                  {visible ? <Eye className="w-3.5 h-3.5 text-neon-green" /> : <EyeOff className="w-3.5 h-3.5 text-text-muted" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hero content */}
      <div>
        <h2 className="font-display text-sm font-bold text-neon-cyan tracking-widest mb-4">HERO CONTENT</h2>
        <div className="glass-panel p-6 space-y-4">
          <div>
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Main Headline</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)}
              className="input-cyber w-full font-display text-lg tracking-widest" />
          </div>
          <div>
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">
              Typewriter Lines (one per line)
            </label>
            <textarea rows={5} value={typewriterLines}
              onChange={(e) => setTypewriterLines(e.target.value)}
              className="input-cyber w-full text-sm resize-none font-mono" />
          </div>
          <button onClick={saveHeroContent} disabled={saving || loading}
            className="btn-neon-green text-sm font-mono px-5 py-2.5 flex items-center gap-2 disabled:opacity-50">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
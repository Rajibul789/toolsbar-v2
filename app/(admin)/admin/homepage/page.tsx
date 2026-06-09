import type { Metadata } from "next";
import { Globe, Star, Eye, EyeOff } from "lucide-react";
import { TOOLS_CONFIG } from "@/config/tools.config";

export const metadata: Metadata = { title: "Homepage Builder" };

export default function AdminHomepagePage() {
  const featured = TOOLS_CONFIG.filter((t) => t.isFeatured);
  const popular  = TOOLS_CONFIG.filter((t) => t.isPopular);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">
          HOMEPAGE BUILDER
        </h1>
        <p className="text-xs font-mono text-text-muted">
          Control what appears on the homepage — featured tools, hero content, and section visibility.
        </p>
      </div>

      {/* Featured slider */}
      <div className="mb-8">
        <h2 className="font-display text-sm font-bold text-neon-cyan tracking-widest mb-4 flex items-center gap-2">
          <Star className="w-4 h-4" />
          FEATURED TOOLS SLIDER
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(0,245,255,0.1)" }}
        >
          <div
            className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-text-muted grid grid-cols-6 gap-4"
            style={{ background: "rgba(0,245,255,0.03)", borderBottom: "1px solid rgba(0,245,255,0.06)" }}
          >
            <div className="col-span-3">Tool</div>
            <div>Headline</div>
            <div>Order</div>
            <div className="text-right">Active</div>
          </div>

          {featured.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-mono text-text-muted">
                No featured tools yet. Go to{" "}
                <a href="/admin/tools" className="text-neon-cyan hover:underline">
                  Tool Manager
                </a>{" "}
                and mark tools as featured using the ⭐ button.
              </p>
            </div>
          ) : (
            featured.map((tool, i) => (
              <div
                key={tool.slug}
                className="grid grid-cols-6 gap-4 px-5 py-3.5 items-center border-b last:border-0"
                style={{ borderColor: "rgba(0,245,255,0.06)", background: i % 2 === 0 ? "rgba(10,15,30,0.6)" : "rgba(13,18,36,0.5)" }}
              >
                <div className="col-span-3 text-sm font-mono text-text-primary">{tool.name}</div>
                <div className="text-xs font-mono text-text-muted italic">{tool.name.toUpperCase()}</div>
                <div className="text-xs font-mono text-neon-cyan">{i + 1}</div>
                <div className="flex justify-end">
                  <button
                    className="w-7 h-7 rounded flex items-center justify-center transition-all"
                    style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)" }}
                  >
                    <Eye className="w-3.5 h-3.5 text-neon-green" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section visibility */}
      <div className="mb-8">
        <h2 className="font-display text-sm font-bold text-neon-cyan tracking-widest mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          SECTION VISIBILITY
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Hero Section",          visible: true,  desc: "Full-screen hero with search" },
            { label: "Featured Tools Slider",  visible: featured.length > 0, desc: "Netflix-style featured carousel" },
            { label: "Tools Grid",             visible: true,  desc: "All tools by category" },
            { label: "Recently Used Section",  visible: true,  desc: "Client-side recent tools" },
            { label: "Why Choose Us",          visible: true,  desc: "Feature highlights section" },
            { label: "FAQ Section",            visible: true,  desc: "Expandable FAQ accordion" },
            { label: "Blog Preview",           visible: true,  desc: "Latest 3 blog posts" },
          ].map(({ label, visible, desc }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl px-4 py-3.5"
              style={{ background: "rgba(10,15,30,0.8)", border: "1px solid rgba(0,245,255,0.08)" }}
            >
              <div>
                <p className="text-xs font-mono font-semibold text-text-primary">{label}</p>
                <p className="text-[11px] font-mono text-text-muted">{desc}</p>
              </div>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: visible ? "rgba(0,255,136,0.1)" : "rgba(71,85,105,0.1)",
                  border: `1px solid ${visible ? "rgba(0,255,136,0.25)" : "rgba(71,85,105,0.2)"}`,
                }}
              >
                {visible ? (
                  <Eye className="w-3.5 h-3.5 text-neon-green" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-text-muted" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Hero content */}
      <div>
        <h2 className="font-display text-sm font-bold text-neon-cyan tracking-widest mb-4">
          HERO CONTENT
        </h2>
        <div className="glass-panel p-6 space-y-4">
          <div>
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">
              Main Headline
            </label>
            <input
              defaultValue="FREE ONLINE TOOLS"
              className="input-cyber w-full font-display text-lg tracking-widest"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">
              Typewriter Lines (one per line)
            </label>
            <textarea
              rows={5}
              defaultValue={"Split PDFs in seconds.\nCompress images instantly.\nConvert documents freely.\nAll in your browser.\nNo uploads. No limits."}
              className="input-cyber w-full text-sm resize-none font-mono"
            />
          </div>
          <button className="btn-neon-green text-sm font-mono px-5 py-2.5">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

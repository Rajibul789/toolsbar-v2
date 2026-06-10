"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { ToolConfig } from "@/config/tools.config";
import { NEON_COLOR_MAP, NEON_BG_CLASS, NEON_BORDER_CLASS, TOOLS_CONFIG } from "@/config/tools.config";
import { ToolCard } from "@/components/tools/ToolCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { useFavorites } from "@/hooks/useFavorites";
import { useToolsStore } from "@/stores/toolsStore";
import { toast } from "sonner";
import { Heart, Share2 } from "lucide-react";

function getLucideIcon(name: string) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Wrench"];
}

interface ToolPageShellProps {
  tool: ToolConfig;
  children: React.ReactNode;
}

export function ToolPageShell({ tool, children }: ToolPageShellProps) {
  const neonColor  = NEON_COLOR_MAP[tool.accentColor];
  const bgColor    = NEON_BG_CLASS[tool.accentColor];
  const borderColor = NEON_BORDER_CLASS[tool.accentColor];
  const Icon       = getLucideIcon(tool.icon);

  // Track usage
  const addRecentTool = useToolsStore((s) => s.addRecentTool);
  useEffect(() => {
    addRecentTool(tool.slug, tool.name);
  }, [tool.slug, tool.name, addRecentTool]);

  // Favorites
  const { isFavorite, toggleFavorite } = useFavorites();
  const faved = isFavorite(tool.slug);

  // Share
  async function handleShare() {
    const url  = `${window.location.origin}/tools/${tool.slug}`;
    const text = `${tool.name} – Free online tool at ToolsBar`;
    if (navigator.share) {
      try { await navigator.share({ title: tool.name, text, url }); return; }
      catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  }

  // Related tools: same category, excluding self
  const relatedTools = TOOLS_CONFIG
    .filter((t) => t.category === tool.category && t.slug !== tool.slug)
    .slice(0, 4);

  // JSON-LD
  const toolSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.longDesc ?? tool.shortDesc,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web Browser",
    url: `https://toolsbar.com/tools/${tool.slug}`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: tool.howItWorks,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",  item: "https://toolsbar.com" },
      { "@type": "ListItem", position: 2, name: "Tools", item: "https://toolsbar.com/tools" },
      { "@type": "ListItem", position: 3, name: tool.name, item: `https://toolsbar.com/tools/${tool.slug}` },
    ],
  };

  const faqSchema = tool.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: tool.faq.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  } : null;

  return (
    <>
      <JsonLd data={toolSchema} />
      <JsonLd data={breadcrumbSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}

      <div className="min-h-screen pt-16">
        {/* Tool header */}
        <div className="relative overflow-hidden border-b py-10"
          style={{ borderColor: `${neonColor}12`, background: `linear-gradient(180deg,${bgColor} 0%,transparent 100%)` }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: `linear-gradient(${neonColor}08 1px,transparent 1px),linear-gradient(90deg,${neonColor}08 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs font-mono text-text-muted mb-6">
              <Link href="/"             className="hover:text-neon-cyan transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/tools"        className="hover:text-neon-cyan transition-colors">Tools</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/tool-category/${tool.category}`} className="hover:text-neon-cyan transition-colors capitalize">
                {tool.category.replace(/-/g, " ")}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span style={{ color: neonColor }}>{tool.name}</span>
            </nav>

            <div className="flex items-start gap-5">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: bgColor, border: `1px solid ${borderColor}`, boxShadow: `0 0 30px ${neonColor}20` }}>
                <Icon className="w-8 h-8" style={{ color: neonColor, filter: `drop-shadow(0 0 8px ${neonColor}80)` }} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h1 className="font-display text-2xl md:text-3xl font-black text-white tracking-wide">
                    {tool.name.toUpperCase()}
                  </h1>
                  {tool.isNew     && <span className="badge-neon-green  text-[10px]">NEW</span>}
                  {tool.isPopular && <span className="badge-neon-purple text-[10px]">POPULAR</span>}
                  {tool.processingMode === "browser" && (
                    <span className="badge-neon text-[10px]">100% BROWSER</span>
                  )}
                </div>
                <p className="text-sm text-text-muted font-mono leading-relaxed max-w-2xl">{tool.shortDesc}</p>
              </div>

              {/* Favorite + Share */}
              <div className="hidden sm:flex gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleFavorite(tool.slug, tool.name)}
                  title={faved ? "Remove from favorites" : "Add to favorites"}
                  className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200"
                  style={{
                    borderColor: faved ? "rgba(255,0,60,0.4)" : "rgba(0,245,255,0.15)",
                    background:  faved ? "rgba(255,0,60,0.08)" : "transparent",
                  }}>
                  <Heart className="w-4 h-4" style={{ color: faved ? "#ff003c" : "#475569", fill: faved ? "#ff003c" : "none" }} />
                </button>
                <button onClick={handleShare} title="Share tool"
                  className="w-9 h-9 rounded-lg border border-neon-cyan/15 flex items-center justify-center text-text-muted hover:text-neon-cyan hover:border-neon-cyan/30 transition-all">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main tool area */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tool UI */}
            <div className="lg:col-span-2">
              <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
                <div className="corner-bracket tl" style={{ borderColor: `${neonColor}30` }} />
                <div className="corner-bracket tr" style={{ borderColor: `${neonColor}30` }} />
                <div className="corner-bracket bl" style={{ borderColor: `${neonColor}30` }} />
                <div className="corner-bracket br" style={{ borderColor: `${neonColor}30` }} />
                {children}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* How it works */}
              {tool.howItWorks.length > 0 && (
                <div className="glass-panel p-5">
                  <h3 className="font-display text-xs font-bold tracking-widest text-white mb-4 uppercase">
                    How It Works
                  </h3>
                  <ol className="space-y-3">
                    {tool.howItWorks.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 mt-0.5"
                          style={{ background: bgColor, border: `1px solid ${borderColor}`, color: neonColor }}>
                          {i + 1}
                        </span>
                        <p className="text-xs text-text-muted font-mono leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Use cases */}
              {tool.useCases.length > 0 && (
                <div className="glass-panel p-5">
                  <h3 className="font-display text-xs font-bold tracking-widest text-white mb-4 uppercase">
                    Use Cases
                  </h3>
                  <ul className="space-y-2">
                    {tool.useCases.map((uc, i) => (
                      <li key={i} className="flex gap-2 text-xs font-mono text-text-muted leading-relaxed">
                        <span style={{ color: neonColor }}>▸</span>{uc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Privacy badge */}
              <div className="rounded-xl p-4"
                style={{ background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.12)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                  <span className="text-xs font-mono font-semibold text-neon-green">PRIVACY PROTECTED</span>
                </div>
                <p className="text-xs font-mono text-text-muted leading-relaxed">
                  {tool.processingMode === "browser"
                    ? "This tool runs 100% in your browser. Your files never leave your device."
                    : "Processing happens locally when possible. Server fallback deletes files immediately."}
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          {tool.faq.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-lg font-black text-white tracking-wider mb-6">
                FREQUENTLY ASKED QUESTIONS
              </h2>
              <div className="space-y-4">
                {tool.faq.map(({ question, answer }, i) => (
                  <div key={i} className="glass-panel p-5" style={{ borderColor: `${neonColor}10` }}>
                    <h3 className="text-sm font-mono font-semibold text-text-primary mb-2">{question}</h3>
                    <p className="text-xs text-text-muted font-mono leading-relaxed">{answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related tools */}
          {relatedTools.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-lg font-black text-white tracking-wider mb-6">RELATED TOOLS</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedTools.map((t, i) => <ToolCard key={t.slug} tool={t} index={i} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
import type { Metadata } from "next";
import { Suspense } from "react";
import { TOOLS_CONFIG, TOOL_CATEGORIES, searchTools } from "@/config/tools.config";
import { ToolCard } from "@/components/tools/ToolCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolsDirectoryClient } from "@/components/tools/ToolsDirectoryClient";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { NEON_COLOR_MAP } from "@/config/tools.config";

export const metadata: Metadata = {
  title: "All Free Online Tools | ToolsBar",
  description:
    `Browse all ${TOOLS_CONFIG.length} free online tools — PDF split, merge, compress, image converter, Word to PDF, OCR, QR scanner, hashtag generator, and more. All browser-based.`,
  alternates: { canonical: "/tools" },
};

const listSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "ToolsBar – All Free Online Tools",
  description: "Complete list of free browser-based online tools",
  numberOfItems: TOOLS_CONFIG.length,
  itemListElement: TOOLS_CONFIG.map((tool, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: tool.name,
    description: tool.shortDesc,
    url: `https://toolsbar.com/tools/${tool.slug}`,
  })),
};

function getLucideIcon(name: string) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Folder"];
}

export default function ToolsPage() {
  return (
    <>
      <JsonLd data={listSchema} />

      <div className="min-h-screen pt-20">
        {/* Header */}
        <div
          className="relative overflow-hidden border-b py-14"
          style={{ borderColor: "rgba(0,245,255,0.08)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <div className="section-label justify-center mb-4">All Tools</div>
            <h1 className="font-display text-4xl md:text-5xl font-black text-white mb-4">
              {TOOLS_CONFIG.length} FREE TOOLS
            </h1>
            <p className="text-text-muted font-mono text-sm max-w-xl mx-auto mb-8">
              Every tool runs in your browser. No file uploads. No accounts. No limits.
            </p>

            {/* Client-side search */}
            <Suspense>
              <ToolsDirectoryClient />
            </Suspense>
          </div>
        </div>

        {/* Category quick nav */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {TOOL_CATEGORIES.map((cat) => {
              const CatIcon = getLucideIcon(cat.icon);
              const color = NEON_COLOR_MAP[cat.color];
              const count = TOOLS_CONFIG.filter((t) => t.category === cat.id).length;
              return (
                <Link
                  key={cat.id}
                  href={`#${cat.id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono transition-all border hover:scale-105"
                  style={{
                    background: `${color}08`,
                    border: `1px solid ${color}25`,
                    color: `${color}cc`,
                  }}
                >
                  <CatIcon className="w-3.5 h-3.5" />
                  {cat.name}
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px]"
                    style={{ background: `${color}15` }}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tools grouped by category */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 space-y-16">
          {TOOL_CATEGORIES.map((cat) => {
            const catTools = TOOLS_CONFIG.filter((t) => t.category === cat.id);
            if (catTools.length === 0) return null;
            const CatIcon = getLucideIcon(cat.icon);
            const color = NEON_COLOR_MAP[cat.color];

            return (
              <section key={cat.id} id={cat.id}>
                {/* Category header */}
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}10`, border: `1px solid ${color}25` }}
                  >
                    <CatIcon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <h2
                      className="font-display text-base font-bold tracking-widest"
                      style={{ color }}
                    >
                      {cat.name.toUpperCase()}
                    </h2>
                    <p className="text-xs text-text-muted font-mono">{cat.description}</p>
                  </div>
                  <div
                    className="px-3 py-1 rounded text-xs font-mono"
                    style={{ background: `${color}08`, color: `${color}80` }}
                  >
                    {catTools.length} tools
                  </div>
                </div>

                {/* Neon divider */}
                <div
                  className="h-px mb-6"
                  style={{
                    background: `linear-gradient(90deg, ${color}40, transparent)`,
                  }}
                />

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {catTools.map((tool, i) => (
                    <ToolCard key={tool.slug} tool={tool} index={i} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
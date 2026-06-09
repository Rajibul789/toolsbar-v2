import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  TOOL_CATEGORIES,
  TOOLS_CONFIG,
  NEON_COLOR_MAP,
  NEON_BG_CLASS,
} from "@/config/tools.config";
import { ToolCard } from "@/components/tools/ToolCard";
import { JsonLd } from "@/components/seo/JsonLd";

function getLucideIcon(name: string) {
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  >;
  return icons[name] ?? icons["Folder"];
}

export function generateStaticParams() {
  return TOOL_CATEGORIES.map((cat) => ({ category: cat.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = TOOL_CATEGORIES.find((c) => c.id === category);
  if (!cat) return {};

  const tools = TOOLS_CONFIG.filter((t) => t.category === category);
  return {
    title: `${cat.name} – ${tools.length} Free Online Tools | ToolsBar`,
    description: `${cat.description} All ${tools.length} tools run directly in your browser — no uploads, no accounts required.`,
    alternates: { canonical: `/tool-category/${category}` },
  };
}

export default async function ToolCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = TOOL_CATEGORIES.find((c) => c.id === category);
  if (!cat) notFound();

  const tools = TOOLS_CONFIG.filter((t) => t.category === category);
  const neonColor = NEON_COLOR_MAP[cat.color];
  const bgColor = NEON_BG_CLASS[cat.color];
  const CatIcon = getLucideIcon(cat.icon);

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cat.name} – Free Online Tools`,
    description: cat.description,
    numberOfItems: tools.length,
    itemListElement: tools.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: `https://toolsbar.com/tools/${t.slug}`,
    })),
  };

  return (
    <>
      <JsonLd data={listSchema} />

      <div className="min-h-screen pt-20">
        {/* Category header */}
        <div
          className="relative overflow-hidden border-b py-14"
          style={{ borderColor: `${neonColor}15` }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${neonColor}08 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(${neonColor}04 1px, transparent 1px), linear-gradient(90deg, ${neonColor}04 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs font-mono text-text-muted mb-6">
              <Link href="/" className="hover:text-neon-cyan transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/tools" className="hover:text-neon-cyan transition-colors">
                Tools
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span style={{ color: neonColor }}>{cat.name}</span>
            </nav>

            <div className="flex items-center gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: bgColor,
                  border: `1px solid ${neonColor}30`,
                  boxShadow: `0 0 40px ${neonColor}20`,
                }}
              >
                <CatIcon
                  className="w-8 h-8"
                  style={{
                    color: neonColor,
                    filter: `drop-shadow(0 0 10px ${neonColor}80)`,
                  }}
                />
              </div>

              <div>
                <span
                  className="text-[10px] font-mono uppercase tracking-widest block mb-1"
                  style={{ color: `${neonColor}60` }}
                >
                  Category
                </span>
                <h1
                  className="font-display text-3xl md:text-4xl font-black text-white tracking-wider mb-2"
                  style={{ textShadow: `0 0 30px ${neonColor}25` }}
                >
                  {cat.name.toUpperCase()}
                </h1>
                <p className="text-sm text-text-muted font-mono">
                  {tools.length} free tools · {cat.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tools grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {/* Category siblings nav */}
          <div className="flex flex-wrap gap-2 mb-10">
            {TOOL_CATEGORIES.map((c) => {
              const active = c.id === category;
              const color = NEON_COLOR_MAP[c.color];
              return (
                <Link
                  key={c.id}
                  href={`/tool-category/${c.id}`}
                  className="px-3 py-1.5 rounded-full text-xs font-mono transition-all border"
                  style={{
                    background: active ? `${color}12` : "transparent",
                    borderColor: active ? `${color}40` : "rgba(255,255,255,0.06)",
                    color: active ? color : "#475569",
                  }}
                >
                  {c.name}
                </Link>
              );
            })}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tools.map((tool, i) => (
              <ToolCard key={tool.slug} tool={tool} index={i} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
"use client";

import { useState } from "react";
import { Star, Eye, EyeOff, BadgeCheck } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { TOOLS_CONFIG, TOOL_CATEGORIES, NEON_COLOR_MAP, NEON_BG_CLASS } from "@/config/tools.config";
import { toast } from "sonner";
import { motion } from "framer-motion";

function getLucideIcon(name: string) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Wrench"];
}

interface ToolState { isActive: boolean; isFeatured: boolean; isNew: boolean; }

export default function AdminToolsPage() {
  // Initialise tool state from static config
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>(() =>
    Object.fromEntries(
      TOOLS_CONFIG.map((t) => [t.slug, { isActive: true, isFeatured: t.isFeatured ?? false, isNew: t.isNew ?? false }])
    )
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function updateTool(slug: string, patch: Partial<ToolState>) {
    setSaving(slug);
    setToolStates((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } }));
    try {
      await fetch("/api/admin/tools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...patch }),
      });
      toast.success(`Updated ${slug}`);
    } catch {
      toast.error("Failed to save — changes are local only until database is connected.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">TOOL MANAGER</h1>
          <p className="text-xs font-mono text-text-muted">
            {TOOLS_CONFIG.length} tools · Toggle visibility, set featured, add NEW badge
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        {[
          { icon: Star,       label: "Add to featured hero slider", color: "#ffcc00" },
          { icon: BadgeCheck, label: "Show NEW badge",              color: "#00ff88" },
          { icon: Eye,        label: "Tool visible on site",        color: "#00f5ff" },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
            <Icon className="w-3.5 h-3.5" style={{ color }} />{label}
          </div>
        ))}
      </div>

      {TOOL_CATEGORIES.map((cat) => {
        const catTools = TOOLS_CONFIG.filter((t) => t.category === cat.id);
        return (
          <div key={cat.id} className="mb-8">
            <h2 className="text-xs font-display font-bold tracking-widest text-text-muted uppercase mb-3">
              {cat.name}
            </h2>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,245,255,0.08)" }}>
              {catTools.map((tool, i) => {
                const Icon  = getLucideIcon(tool.icon);
                const color = NEON_COLOR_MAP[tool.accentColor];
                const state = toolStates[tool.slug] ?? { isActive: true, isFeatured: false, isNew: false };
                const isBusy = saving === tool.slug;

                return (
                  <motion.div key={tool.slug}
                    layout
                    className="flex items-center gap-4 px-5 py-4 border-b last:border-0 hover:bg-neon-cyan/[0.015] transition-colors"
                    style={{ borderColor: "rgba(0,245,255,0.06)", background: i % 2 === 0 ? "rgba(10,15,30,0.6)" : "rgba(13,18,36,0.6)", opacity: isBusy ? 0.7 : 1 }}>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: NEON_BG_CLASS[tool.accentColor], border: `1px solid ${color}25` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono text-text-primary">{tool.name}</span>
                        {state.isNew      && <span className="badge-neon-green  text-[10px]">NEW</span>}
                        {state.isFeatured && <span className="badge-neon        text-[10px]">FEATURED</span>}
                        {!state.isActive  && <span className="badge-neon-red    text-[10px]">DISABLED</span>}
                      </div>
                      <p className="text-xs font-mono text-text-muted truncate mt-0.5">{tool.shortDesc}</p>
                    </div>

                    {/* Processing mode */}
                    <span className="hidden md:block text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{
                        background: tool.processingMode === "browser" ? "rgba(0,255,136,0.08)" : "rgba(0,102,255,0.08)",
                        border: `1px solid ${tool.processingMode === "browser" ? "rgba(0,255,136,0.2)" : "rgba(0,102,255,0.2)"}`,
                        color: tool.processingMode === "browser" ? "#00ff88" : "#0066ff",
                      }}>
                      {tool.processingMode.toUpperCase()}
                    </span>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      {/* Featured toggle */}
                      <button
                        onClick={() => updateTool(tool.slug, { isFeatured: !state.isFeatured })}
                        disabled={isBusy}
                        title={state.isFeatured ? "Remove from featured slider" : "Add to featured slider"}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 disabled:cursor-wait"
                        style={{
                          background: state.isFeatured ? "rgba(255,204,0,0.12)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${state.isFeatured ? "rgba(255,204,0,0.4)" : "rgba(255,255,255,0.1)"}`,
                          color: state.isFeatured ? "#ffcc00" : "#475569",
                        }}>
                        <Star className="w-3.5 h-3.5" style={{ fill: state.isFeatured ? "#ffcc00" : "none" }} />
                      </button>

                      {/* NEW badge toggle */}
                      <button
                        onClick={() => updateTool(tool.slug, { isNew: !state.isNew })}
                        disabled={isBusy}
                        title={state.isNew ? "Remove NEW badge" : "Add NEW badge"}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 disabled:cursor-wait"
                        style={{
                          background: state.isNew ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${state.isNew ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.1)"}`,
                          color: state.isNew ? "#00ff88" : "#475569",
                        }}>
                        <BadgeCheck className="w-3.5 h-3.5" />
                      </button>

                      {/* Active toggle */}
                      <button
                        onClick={() => updateTool(tool.slug, { isActive: !state.isActive })}
                        disabled={isBusy}
                        title={state.isActive ? "Disable tool" : "Enable tool"}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 disabled:cursor-wait"
                        style={{
                          background: state.isActive ? "rgba(0,245,255,0.08)" : "rgba(255,0,60,0.08)",
                          border: `1px solid ${state.isActive ? "rgba(0,245,255,0.2)" : "rgba(255,0,60,0.2)"}`,
                          color: state.isActive ? "#00f5ff" : "#ff003c",
                        }}>
                        {state.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
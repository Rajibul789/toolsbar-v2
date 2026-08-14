"use client";

import { useState, useEffect } from "react";
import { Star, Eye, EyeOff, BadgeCheck, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { TOOLS_CONFIG, TOOL_CATEGORIES, NEON_COLOR_MAP, NEON_BG_CLASS } from "@/config/tools.config";
import { toast } from "sonner";
import { motion } from "framer-motion";

function getLucideIcon(name: string) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Wrench"];
}

interface ToolState { isActive: boolean; isFeatured: boolean; isNew: boolean; order: number; }

function staticDefaults(): Record<string, ToolState> {
  return Object.fromEntries(
    TOOLS_CONFIG.map((t) => [
      t.slug,
      { isActive: true, isFeatured: t.isFeatured ?? false, isNew: t.isNew ?? false, order: t.order },
    ])
  );
}

export default function AdminToolsPage() {
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>(staticDefaults);
  const [saving,  setSaving]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load real DB state on mount — prevents admin from seeing stale static-config values
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/tools");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Could not load DB state.");
        }
        const dbTools = await res.json() as Array<{
          slug: string; isActive: boolean; isFeatured: boolean; isNew: boolean; order: number;
        }>;
        if (Array.isArray(dbTools) && dbTools.length > 0) {
          const map: Record<string, ToolState> = { ...staticDefaults() };
          for (const t of dbTools) {
            map[t.slug] = { isActive: t.isActive, isFeatured: t.isFeatured, isNew: t.isNew, order: t.order };
          }
          setToolStates(map);
        }
      } catch (err) {
        toast.warning(err instanceof Error ? err.message : "Could not load DB state — showing local defaults.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function updateTool(slug: string, patch: Partial<ToolState>) {
    setSaving(slug);
    const previous = toolStates[slug];
    setToolStates((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } }));
    try {
      const res = await fetch("/api/admin/tools", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slug, ...patch }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Save failed.");
      }
      toast.success("Saved — public site updated");
    } catch (err) {
      setToolStates((prev) => {
        const next = { ...prev };
        if (previous) next[slug] = previous;
        else delete next[slug];
        return next;
      });
      toast.error(err instanceof Error ? err.message : "Save failed — please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function moveOrder(categoryTools: typeof TOOLS_CONFIG, index: number, dir: "up" | "down") {
    const swapIndex = dir === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categoryTools.length) return;

    const a = categoryTools[index];
    const b = categoryTools[swapIndex];
    const aOrder = toolStates[a.slug]?.order ?? a.order;
    const bOrder = toolStates[b.slug]?.order ?? b.order;

    setSaving(a.slug);
    const previousA = toolStates[a.slug];
    const previousB = toolStates[b.slug];
    setToolStates((prev) => ({
      ...prev,
      [a.slug]: { ...(prev[a.slug] ?? staticDefaults()[a.slug]), order: bOrder },
      [b.slug]: { ...(prev[b.slug] ?? staticDefaults()[b.slug]), order: aOrder },
    }));

    try {
      const [resA, resB] = await Promise.all([
        fetch("/api/admin/tools", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: a.slug, order: bOrder }),
        }),
        fetch("/api/admin/tools", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: b.slug, order: aOrder }),
        }),
      ]);
      if (!resA.ok || !resB.ok) throw new Error("Reorder failed.");
      toast.success("Order updated — public site updated");
    } catch (err) {
      setToolStates((prev) => {
        const next = { ...prev };
        if (previousA) next[a.slug] = previousA; else delete next[a.slug];
        if (previousB) next[b.slug] = previousB; else delete next[b.slug];
        return next;
      });
      toast.error(err instanceof Error ? err.message : "Reorder failed — please try again.");
    } finally {
      setSaving(null);
    }
  }


  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">TOOL MANAGER</h1>
          <p className="text-xs font-mono text-text-muted">
            {TOOLS_CONFIG.length} tools · Toggle visibility, set featured, add NEW badge, reorder within category
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Loading DB state…
          </div>
        )}
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

      {/* Tool list grouped by category */}
      {TOOL_CATEGORIES.map((cat) => {
        const catTools = TOOLS_CONFIG
          .filter((t) => t.category === cat.id)
          .slice()
          .sort((a, b) => (toolStates[a.slug]?.order ?? a.order) - (toolStates[b.slug]?.order ?? b.order));
        return (
          <div key={cat.id} className="mb-8">
            <h2 className="text-xs font-display font-bold tracking-widest text-text-muted uppercase mb-3">
              {cat.name}
            </h2>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,245,255,0.08)" }}>
              {catTools.map((tool, i) => {
                const Icon   = getLucideIcon(tool.icon);
                const color  = NEON_COLOR_MAP[tool.accentColor];
                const state  = toolStates[tool.slug] ?? { isActive: true, isFeatured: false, isNew: false };
                const isBusy = saving === tool.slug;

                return (
                  <motion.div
                    key={tool.slug}
                    layout
                    className="flex items-center gap-4 px-5 py-4 border-b last:border-0 hover:bg-neon-cyan/[0.015] transition-colors"
                    style={{
                      borderColor: "rgba(0,245,255,0.06)",
                      background:  i % 2 === 0 ? "rgba(10,15,30,0.6)" : "rgba(13,18,36,0.6)",
                      opacity:     isBusy ? 0.7 : 1,
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: NEON_BG_CLASS[tool.accentColor], border: `1px solid ${color}25` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono text-text-primary">{tool.name}</span>
                        {state.isNew      && <span className="badge-neon-green text-[10px]">NEW</span>}
                        {state.isFeatured && <span className="badge-neon       text-[10px]">FEATURED</span>}
                        {!state.isActive  && <span className="badge-neon-red   text-[10px]">DISABLED</span>}
                      </div>
                      <p className="text-xs font-mono text-text-muted truncate mt-0.5">{tool.shortDesc}</p>
                    </div>

                    {/* Processing mode badge */}
                    <span
                      className="hidden md:block text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{
                        background: tool.processingMode === "browser" ? "rgba(0,255,136,0.08)" : "rgba(0,102,255,0.08)",
                        border: `1px solid ${tool.processingMode === "browser" ? "rgba(0,255,136,0.2)" : "rgba(0,102,255,0.2)"}`,
                        color:  tool.processingMode === "browser" ? "#00ff88" : "#0066ff",
                      }}
                    >
                      {tool.processingMode.toUpperCase()}
                    </span>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveOrder(catTools, i, "up")}
                          disabled={isBusy || loading || i === 0}
                          title="Move up"
                          className="w-6 h-3.5 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                          style={{ background: "rgba(255,255,255,0.04)" }}
                        >
                          <ArrowUp className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => moveOrder(catTools, i, "down")}
                          disabled={isBusy || loading || i === catTools.length - 1}
                          title="Move down"
                          className="w-6 h-3.5 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                          style={{ background: "rgba(255,255,255,0.04)" }}
                        >
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Featured */}
                      <button
                        onClick={() => updateTool(tool.slug, { isFeatured: !state.isFeatured })}
                        disabled={isBusy || loading}
                        title={state.isFeatured ? "Remove from featured slider" : "Add to featured slider"}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:cursor-wait"
                        style={{
                          background: state.isFeatured ? "rgba(255,204,0,0.12)" : "rgba(255,255,255,0.04)",
                          border:     `1px solid ${state.isFeatured ? "rgba(255,204,0,0.4)" : "rgba(255,255,255,0.1)"}`,
                          color:      state.isFeatured ? "#ffcc00" : "#475569",
                        }}
                      >
                        <Star className="w-3.5 h-3.5" style={{ fill: state.isFeatured ? "#ffcc00" : "none" }} />
                      </button>

                      {/* NEW badge */}
                      <button
                        onClick={() => updateTool(tool.slug, { isNew: !state.isNew })}
                        disabled={isBusy || loading}
                        title={state.isNew ? "Remove NEW badge" : "Add NEW badge"}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:cursor-wait"
                        style={{
                          background: state.isNew ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.04)",
                          border:     `1px solid ${state.isNew ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.1)"}`,
                          color:      state.isNew ? "#00ff88" : "#475569",
                        }}
                      >
                        <BadgeCheck className="w-3.5 h-3.5" />
                      </button>

                      {/* Active */}
                      <button
                        onClick={() => updateTool(tool.slug, { isActive: !state.isActive })}
                        disabled={isBusy || loading}
                        title={state.isActive ? "Disable tool" : "Enable tool"}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:cursor-wait"
                        style={{
                          background: state.isActive ? "rgba(0,245,255,0.08)" : "rgba(255,0,60,0.08)",
                          border:     `1px solid ${state.isActive ? "rgba(0,245,255,0.2)" : "rgba(255,0,60,0.2)"}`,
                          color:      state.isActive ? "#00f5ff" : "#ff003c",
                        }}
                      >
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
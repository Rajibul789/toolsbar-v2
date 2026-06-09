"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Clock, Trash2, ExternalLink } from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { useToolsStore } from "@/stores/toolsStore";
import { TOOLS_CONFIG, NEON_COLOR_MAP, NEON_BG_CLASS } from "@/config/tools.config";
import { formatDateRelative } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";

type Tab = "recent" | "favorites";

function getLucideIcon(name: string) {
  const icons = LucideIcons as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Wrench"];
}

function ToolRow({ slug, name, usedAt, showRemove, onRemove }: {
  slug: string; name: string; usedAt?: number;
  showRemove?: boolean; onRemove?: () => void;
}) {
  const tool = TOOLS_CONFIG.find((t) => t.slug === slug);
  if (!tool) return null;
  const Icon  = getLucideIcon(tool.icon);
  const color = NEON_COLOR_MAP[tool.accentColor];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl group transition-all"
      style={{ background: "rgba(10,15,30,0.8)", border: "1px solid rgba(0,245,255,0.07)" }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: NEON_BG_CLASS[tool.accentColor], border: `1px solid ${color}25` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-text-primary group-hover:text-neon-cyan transition-colors">
          {tool.name}
        </p>
        {usedAt && (
          <p className="text-[11px] font-mono text-text-muted flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDateRelative(new Date(usedAt))}
          </p>
        )}
        <p className="text-[11px] font-mono text-text-muted capitalize">{tool.category.replace(/-/g, " ")}</p>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/tools/${slug}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-neon-cyan/20 rounded-lg text-text-muted hover:text-neon-cyan hover:border-neon-cyan/40 transition-all">
          <ExternalLink className="w-3 h-3" />Launch
        </Link>
        {showRemove && onRemove && (
          <button onClick={onRemove}
            className="w-7 h-7 flex items-center justify-center rounded border border-transparent text-text-muted hover:text-neon-red hover:border-neon-red/25 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function HistoryPageClient() {
  const [tab, setTab] = useState<Tab>("recent");
  const { recentTools, clearHistory } = useToolsStore();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  const favTools = TOOLS_CONFIG.filter((t) => favorites.includes(t.slug));

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl"
        style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.08)" }}>
        {([
          { id: "recent",    label: "Recent Tools",   icon: Clock,  count: recentTools.length },
          { id: "favorites", label: "Favorites",      icon: Heart,  count: favTools.length },
        ] as const).map(({ id, label, icon: Icon, count }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-mono font-semibold transition-all"
            style={{
              background: tab === id ? "rgba(0,245,255,0.12)" : "transparent",
              color: tab === id ? "#00f5ff" : "#475569",
              border: tab === id ? "1px solid rgba(0,245,255,0.25)" : "1px solid transparent",
            }}>
            <Icon className="w-4 h-4" />
            {label}
            <span className="px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: "rgba(0,245,255,0.1)" }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Recent Tools Tab */}
      {tab === "recent" && (
        <div className="space-y-3">
          {recentTools.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-mono text-text-muted">
                  {recentTools.length} recently used tool{recentTools.length !== 1 ? "s" : ""}
                </p>
                <button onClick={() => { clearHistory(); toast.success("History cleared"); }}
                  className="text-xs font-mono text-text-muted hover:text-neon-red transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />Clear all
                </button>
              </div>
              {recentTools.map((r) => (
                <ToolRow key={r.slug} slug={r.slug} name={r.name} usedAt={r.usedAt} />
              ))}
            </>
          ) : (
            <div className="rounded-xl p-12 text-center"
              style={{ background: "rgba(0,245,255,0.02)", border: "1px dashed rgba(0,245,255,0.1)" }}>
              <Clock className="w-10 h-10 text-text-muted mx-auto mb-4 opacity-40" />
              <p className="text-sm font-mono text-text-muted">No recent tool usage yet.</p>
              <p className="text-xs font-mono text-text-muted/60 mt-1">
                Tools you use will appear here automatically.
              </p>
              <Link href="/tools" className="btn-neon inline-flex mt-6 text-sm">Browse Tools</Link>
            </div>
          )}
        </div>
      )}

      {/* Favorites Tab */}
      {tab === "favorites" && (
        <div className="space-y-3">
          {favTools.length > 0 ? (
            <>
              <p className="text-xs font-mono text-text-muted mb-2">
                {favTools.length} saved favorite{favTools.length !== 1 ? "s" : ""}
              </p>
              {favTools.map((tool) => (
                <ToolRow
                  key={tool.slug}
                  slug={tool.slug}
                  name={tool.name}
                  showRemove
                  onRemove={() => toggleFavorite(tool.slug, tool.name)}
                />
              ))}
            </>
          ) : (
            <div className="rounded-xl p-12 text-center"
              style={{ background: "rgba(0,245,255,0.02)", border: "1px dashed rgba(0,245,255,0.1)" }}>
              <Heart className="w-10 h-10 text-text-muted mx-auto mb-4 opacity-40" />
              <p className="text-sm font-mono text-text-muted">No favorites saved yet.</p>
              <p className="text-xs font-mono text-text-muted/60 mt-1">
                Click the ❤ icon on any tool page to add it here.
              </p>
              <Link href="/tools" className="btn-neon inline-flex mt-6 text-sm">Browse Tools</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

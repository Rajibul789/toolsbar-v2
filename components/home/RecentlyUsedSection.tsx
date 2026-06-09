"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useToolsStore } from "@/stores/toolsStore";
import { TOOLS_CONFIG, NEON_COLOR_MAP, NEON_BG_CLASS } from "@/config/tools.config";
import { formatDateRelative } from "@/lib/utils";

function getLucideIcon(name: string) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Wrench"];
}

export function RecentlyUsedSection() {
  const { recentTools, clearHistory } = useToolsStore();

  if (recentTools.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-neon-cyan/60" />
          <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
            Recently Used
          </span>
        </div>
        <button
          onClick={clearHistory}
          className="text-[11px] font-mono text-text-muted hover:text-neon-red transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {recentTools.map((recent, i) => {
          const tool = TOOLS_CONFIG.find((t) => t.slug === recent.slug);
          if (!tool) return null;

          const Icon = getLucideIcon(tool.icon);
          const color = NEON_COLOR_MAP[tool.accentColor];

          return (
            <motion.div
              key={recent.slug}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/tools/${tool.slug}`}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border transition-all hover:scale-105 group"
                style={{
                  background: NEON_BG_CLASS[tool.accentColor],
                  border: `1px solid ${color}20`,
                }}
              >
                <Icon
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color }}
                />
                <div>
                  <p className="text-xs font-mono text-text-primary group-hover:text-white transition-colors leading-none">
                    {tool.name}
                  </p>
                  <p className="text-[10px] font-mono text-text-muted leading-none mt-0.5">
                    {formatDateRelative(new Date(recent.usedAt))}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
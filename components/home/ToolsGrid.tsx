"use client";

import { motion } from "framer-motion";
import { TOOLS_CONFIG, TOOL_CATEGORIES, getToolsByCategory, NEON_COLOR_MAP } from "@/config/tools.config";
import { ToolCard } from "@/components/tools/ToolCard";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { ArrowRight } from "lucide-react";

function getLucideIcon(name: string) {
  const icons = LucideIcons as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Folder"];
}

export function ToolsGrid() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <div className="section-label justify-center mb-4">All Tools</div>
        <h2 className="font-display text-3xl md:text-4xl font-black text-white mb-4">
          EVERYTHING YOU NEED
        </h2>
        <p className="text-text-muted font-mono text-sm max-w-xl mx-auto">
          {TOOLS_CONFIG.length} free tools across {TOOL_CATEGORIES.length} categories.
          All browser-based. No accounts. No limits.
        </p>
      </motion.div>

      {/* Categories */}
      {TOOL_CATEGORIES.map((cat, catIdx) => {
        const catTools = getToolsByCategory(cat.id);
        if (catTools.length === 0) return null;
        const CatIcon = getLucideIcon(cat.icon);
        const neonColor = NEON_COLOR_MAP[cat.color];

        return (
          <div key={cat.id} className="mb-16">
            {/* Category header */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between mb-6"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${neonColor}12`,
                    border: `1px solid ${neonColor}30`,
                  }}
                >
                  <CatIcon className="w-4 h-4" style={{ color: neonColor }} />
                </div>
                <div>
                  <h3
                    className="font-display text-sm font-bold tracking-widest"
                    style={{ color: neonColor }}
                  >
                    {cat.name.toUpperCase()}
                  </h3>
                  <p className="text-xs text-text-muted font-mono">{cat.description}</p>
                </div>
              </div>

              <Link
                href={`/tools/${cat.id}`}
                className="hidden sm:flex items-center gap-1.5 text-xs font-mono transition-all duration-200 group"
                style={{ color: `${neonColor}70` }}
              >
                View all
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Category divider */}
            <div
              className="h-[1px] mb-6"
              style={{
                background: `linear-gradient(90deg, ${neonColor}30, transparent)`,
              }}
            />

            {/* Tools grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {catTools.map((tool, i) => (
                <ToolCard
                  key={tool.slug}
                  tool={tool}
                  index={catIdx * 4 + i}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, ArrowRight, Zap } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { TOOLS_CONFIG, NEON_COLOR_MAP, NEON_BG_CLASS, getPopularTools } from "@/config/tools.config";

function getLucideIcon(name: string) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Wrench"];
}

const POPULAR_TOOLS = getPopularTools(6);

const USAGE_LABELS: Record<string, string> = {
  "pdf-split":        "Most Used",
  "image-compressor": "Trending",
  "pdf-merge":        "Popular",
  "text-to-pdf":      "Editor Pick",
  "word-to-pdf":      "Top Rated",
  "image-converter":  "Popular",
};

export function PopularToolsSection() {
  const shouldReduceMotion = useReducedMotion();
  if (POPULAR_TOOLS.length === 0) return null;

  return (
    <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-end justify-between mb-8"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-neon-cyan" />
            <span className="section-label">Most Popular</span>
          </div>
          <h2 className="font-display text-3xl font-black text-white tracking-wider">
            TOP TOOLS
          </h2>
          <p className="text-text-muted font-mono text-sm mt-1">
            The tools our users reach for most.
          </p>
        </div>
        <Link
          href="/tools"
          className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-neon-cyan/60 hover:text-neon-cyan transition-colors group"
        >
          All {TOOLS_CONFIG.length} tools
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>

      {/* Popular tools grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {POPULAR_TOOLS.map((tool, i) => {
          const Icon      = getLucideIcon(tool.icon);
          const color     = NEON_COLOR_MAP[tool.accentColor];
          const bgColor   = NEON_BG_CLASS[tool.accentColor];
          const usageLabel = USAGE_LABELS[tool.slug] ?? "Popular";

          return (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.07 }}
            >
              <Link href={`/tools/${tool.slug}`} className="group block">
                <motion.div
                  className="relative rounded-xl p-5 overflow-hidden transition-all duration-300 cursor-pointer"
                  style={{
                    background: bgColor,
                    border: `1px solid ${color}25`,
                    boxShadow: `0 0 0 1px ${color}08`,
                  }}
                  whileHover={shouldReduceMotion ? undefined : { y: -4, boxShadow: `0 0 30px ${color}20, 0 0 0 1px ${color}40` }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {/* Background glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `radial-gradient(circle at 0% 0%, ${color}12, transparent 60%)` }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      {/* Icon */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: `${color}15`,
                          border: `1px solid ${color}35`,
                          boxShadow: `0 0 20px ${color}15`,
                        }}
                      >
                        <Icon
                          className="w-6 h-6"
                          style={{ color, filter: `drop-shadow(0 0 6px ${color}80)` }}
                        />
                      </div>

                      {/* Usage label */}
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold"
                        style={{
                          background: `${color}12`,
                          border: `1px solid ${color}25`,
                          color: `${color}cc`,
                        }}
                      >
                        <Zap className="w-2.5 h-2.5" />
                        {usageLabel}
                      </div>
                    </div>

                    <h3
                      className="font-display text-sm font-bold tracking-wide mb-1.5 group-hover:brightness-125 transition-all"
                      style={{ color: color }}
                    >
                      {tool.name.toUpperCase()}
                    </h3>
                    <p className="text-xs text-text-muted font-mono leading-relaxed mb-4">
                      {tool.shortDesc}
                    </p>

                    {/* Launch row */}
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-mono uppercase tracking-wider"
                        style={{ color: `${color}60` }}
                      >
                        {tool.category.replace(/-/g, " ")}
                      </span>
                      <div
                        className="flex items-center gap-1 text-[11px] font-mono font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color }}
                      >
                        Launch <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
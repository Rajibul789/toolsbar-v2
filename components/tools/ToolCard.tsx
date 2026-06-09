"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { ToolConfig, NeonColor } from "@/config/tools.config";
import { NEON_COLOR_MAP, NEON_BG_CLASS, NEON_BORDER_CLASS } from "@/config/tools.config";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: ToolConfig;
  index?: number;
  className?: string;
}

function getLucideIcon(name: string) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Wrench"];
}

const BADGE_VARIANTS: Record<string, string> = {
  NEW:     "badge-neon-green",
  POPULAR: "badge-neon-purple",
  HOT:     "badge-neon-red",
};

export function ToolCard({ tool, index = 0, className }: ToolCardProps) {
  const Icon = getLucideIcon(tool.icon);
  const neonColor: NeonColor = tool.accentColor;
  const color = NEON_COLOR_MAP[neonColor];
  const bgColor = NEON_BG_CLASS[neonColor];
  const borderColor = NEON_BORDER_CLASS[neonColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Link href={`/tools/${tool.slug}`} className="block group">
        <motion.div
          className={cn("tool-card p-5 h-full flex flex-col gap-4", className)}
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {/* Icon + badges row */}
          <div className="flex items-start justify-between">
            <motion.div
              className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: bgColor,
                border: `1px solid ${borderColor}`,
              }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color, filter: `drop-shadow(0 0 6px ${color}60)` }}
              />
            </motion.div>

            <div className="flex flex-wrap gap-1">
              {tool.isNew && (
                <span className="badge-neon-green text-[10px]">NEW</span>
              )}
              {tool.isPopular && (
                <span className="badge-neon-purple text-[10px]">POPULAR</span>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="flex-1">
            <h3 className="font-display text-sm font-bold text-white mb-1.5 group-hover:text-neon-cyan transition-colors duration-200 tracking-wide">
              {tool.name.toUpperCase()}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              {tool.shortDesc}
            </p>
          </div>

          {/* Category tag + arrow */}
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-mono uppercase tracking-wider"
              style={{ color: `${color}80` }}
            >
              {tool.category.replace("-", " ")}
            </span>

            <motion.div
              className="flex items-center gap-1 text-xs font-mono transition-all duration-200"
              style={{ color: `${color}60` }}
              whileHover={{ x: 2 }}
            >
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">
                LAUNCH
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:opacity-100 opacity-50 transition-opacity" />
            </motion.div>
          </div>

          {/* Bottom neon accent line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
            }}
          />
        </motion.div>
      </Link>
    </motion.div>
  );
}

// Compact list variant for search results
export function ToolCardCompact({ tool }: { tool: ToolConfig }) {
  const Icon = getLucideIcon(tool.icon);
  const color = NEON_COLOR_MAP[tool.accentColor];

  return (
    <Link href={`/tools/${tool.slug}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-neon-cyan/5 transition-colors group">
      <div
        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
        style={{ background: NEON_BG_CLASS[tool.accentColor], border: `1px solid ${NEON_BORDER_CLASS[tool.accentColor]}` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-text-primary group-hover:text-neon-cyan transition-colors truncate">
          {tool.name}
        </p>
        <p className="text-xs text-text-muted truncate">{tool.shortDesc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-neon-cyan transition-colors flex-shrink-0" />
    </Link>
  );
}
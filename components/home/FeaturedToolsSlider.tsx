"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { TOOLS_CONFIG, NEON_COLOR_MAP, NEON_BG_CLASS } from "@/config/tools.config";

const FEATURED_TOOLS = TOOLS_CONFIG.filter((t) => t.isFeatured);

const SLIDE_CONFIGS: Record<
  string,
  { headline: string; sub: string; badge: string; gradient: string }
> = {
  "pdf-split": {
    headline: "SPLIT ANY PDF",
    sub: "Extract pages, ranges, and chapters in seconds. 100% private — runs in your browser.",
    badge: "MOST USED",
    gradient: "linear-gradient(135deg, rgba(0,245,255,0.12) 0%, rgba(0,245,255,0.02) 60%, transparent 100%)",
  },
  "text-to-pdf": {
    headline: "WRITE & EXPORT",
    sub: "Full Markdown editor with live preview. Export any document to a beautifully formatted PDF.",
    badge: "UPGRADED",
    gradient: "linear-gradient(135deg, rgba(0,255,136,0.12) 0%, rgba(0,255,136,0.02) 60%, transparent 100%)",
  },
};

function getLucideIcon(name: string) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Wrench"];
}

export function FeaturedToolsSlider() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tools = FEATURED_TOOLS.length > 0 ? FEATURED_TOOLS : TOOLS_CONFIG.slice(0, 3);

  const go = useCallback(
    (idx: number, dir: "left" | "right") => {
      setDirection(dir);
      setCurrent((idx + tools.length) % tools.length);
    },
    [tools.length]
  );

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDirection("right");
      setCurrent((prev) => (prev + 1) % tools.length);
    }, 6000);
  }, [tools.length]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const tool = tools[current];
  if (!tool) return null;

  const slideConfig = SLIDE_CONFIGS[tool.slug] ?? {
    headline: tool.name.toUpperCase(),
    sub: tool.longDesc ?? tool.shortDesc,
    badge: tool.isNew ? "NEW" : tool.isPopular ? "POPULAR" : "FEATURED",
    gradient: "linear-gradient(135deg, rgba(0,245,255,0.1) 0%, transparent 100%)",
  };
  const Icon = getLucideIcon(tool.icon);
  const neonColor = NEON_COLOR_MAP[tool.accentColor];

  const variants = {
    enter: (dir: "left" | "right") => ({
      x: dir === "right" ? 80 : -80,
      opacity: 0,
      filter: "blur(4px)",
    }),
    center: { x: 0, opacity: 1, filter: "blur(0px)" },
    exit: (dir: "left" | "right") => ({
      x: dir === "right" ? -80 : 80,
      opacity: 0,
      filter: "blur(4px)",
    }),
  };

  return (
    <section className="w-full relative overflow-hidden">
      {/* Section label */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="section-label mb-6">Featured Tools</div>
      </div>

      {/* Slider */}
      <div
        className="relative overflow-hidden mx-4 sm:mx-6 lg:mx-8 rounded-2xl"
        style={{
          border: "1px solid rgba(0,245,255,0.1)",
          minHeight: 420,
        }}
      >
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{ background: slideConfig.gradient }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "linear-gradient(rgba(0,245,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Slide content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={tool.slug}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-10 flex flex-col md:flex-row items-center gap-8 p-8 md:p-12 lg:p-16 h-full"
          >
            {/* Left: Icon */}
            <motion.div
              className="flex-shrink-0"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
            >
              <div
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl flex items-center justify-center relative"
                style={{
                  background: NEON_BG_CLASS[tool.accentColor],
                  border: `2px solid ${neonColor}40`,
                  boxShadow: `0 0 60px ${neonColor}25`,
                }}
              >
                <Icon
                  className="w-14 h-14 md:w-16 md:h-16"
                  style={{
                    color: neonColor,
                    filter: `drop-shadow(0 0 15px ${neonColor}80)`,
                  }}
                />
                {/* Corner brackets on icon */}
                <div className="corner-bracket tl" style={{ borderColor: `${neonColor}60` }} />
                <div className="corner-bracket tr" style={{ borderColor: `${neonColor}60` }} />
                <div className="corner-bracket bl" style={{ borderColor: `${neonColor}60` }} />
                <div className="corner-bracket br" style={{ borderColor: `${neonColor}60` }} />
              </div>
            </motion.div>

            {/* Right: Content */}
            <div className="flex-1 text-center md:text-left">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span className="badge-neon text-[11px] mb-4 inline-flex"
                  style={{ borderColor: `${neonColor}40`, background: `${neonColor}12`, color: neonColor }}>
                  {slideConfig.badge}
                </span>
              </motion.div>

              <motion.h2
                className="font-display text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{ textShadow: `0 0 40px ${neonColor}30` }}
              >
                {slideConfig.headline}
              </motion.h2>

              <motion.p
                className="text-text-secondary font-mono text-sm md:text-base mb-8 max-w-lg leading-relaxed"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {slideConfig.sub}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-3 justify-center md:justify-start"
              >
                <Link
                  href={`/tools/${tool.slug}`}
                  className="btn-neon inline-flex items-center gap-2"
                  style={{
                    borderColor: `${neonColor}80`,
                    color: neonColor,
                    textShadow: `0 0 10px ${neonColor}60`,
                    boxShadow: `0 0 20px ${neonColor}15`,
                  }}
                >
                  <Zap className="w-4 h-4" />
                  LAUNCH TOOL
                </Link>
                <Link
                  href="/tools"
                  className="px-5 py-2.5 rounded-lg border border-text-muted/20 text-text-muted text-sm font-mono hover:border-text-muted/40 hover:text-text-secondary transition-all duration-200"
                >
                  All Tools
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center border border-neon-cyan/20 text-text-muted hover:text-neon-cyan hover:border-neon-cyan/40 transition-all glass-panel"
          onClick={() => { go(current - 1, "left"); startTimer(); }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center border border-neon-cyan/20 text-text-muted hover:text-neon-cyan hover:border-neon-cyan/40 transition-all glass-panel"
          onClick={() => { go(current + 1, "right"); startTimer(); }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {tools.map((_, i) => (
            <button
              key={i}
              onClick={() => { go(i, i > current ? "right" : "left"); startTimer(); }}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 6,
                background: i === current ? neonColor : "rgba(255,255,255,0.2)",
                boxShadow: i === current ? `0 0 8px ${neonColor}80` : "none",
              }}
            />
          ))}
        </div>

        {/* Auto-progress bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent z-20">
          <motion.div
            key={`${current}-progress`}
            className="h-full"
            style={{
              background: `linear-gradient(90deg, ${neonColor}, ${neonColor}60)`,
              boxShadow: `0 0 8px ${neonColor}60`,
            }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 6, ease: "linear" }}
          />
        </div>
      </div>
    </section>
  );
}
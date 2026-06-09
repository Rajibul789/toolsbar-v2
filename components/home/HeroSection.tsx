"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Search, ChevronRight, Shield, Zap, Lock } from "lucide-react";
import { MatrixRain } from "@/components/animations/MatrixRain";
import { TypeWriter } from "@/components/animations/TypeWriter";
import { GlitchText } from "@/components/animations/GlitchText";
import { searchTools } from "@/config/tools.config";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const TYPEWRITER_TEXTS = [
  "Split PDFs in seconds.",
  "Compress images instantly.",
  "Convert documents freely.",
  "All in your browser.",
  "No uploads. No limits.",
];

const STATS = [
  { value: "15+", label: "Free Tools" },
  { value: "100%", label: "Browser-Based" },
  { value: "0",   label: "File Uploads" },
  { value: "∞",   label: "Usage Limit" },
];

const TRUST_BADGES = [
  { icon: Lock,   text: "No Server Uploads" },
  { icon: Shield, text: "Privacy First" },
  { icon: Zap,    text: "Instant Processing" },
];

export function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReturnType<typeof searchTools>>([]);
  const [isFocused, setIsFocused] = useState(false);

  function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length >= 1) {
      setResults(searchTools(q).slice(0, 6));
    } else {
      setResults([]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (results.length === 1) {
      router.push(`/tools/${results[0].slug}`);
    } else if (query.trim()) {
      router.push(`/tools?q=${encodeURIComponent(query)}`);
    } else {
      router.push("/tools");
    }
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
      {/* Matrix Rain background */}
      <div className="absolute inset-0 overflow-hidden">
        <MatrixRain opacity={0.15} color="#00f5ff" />
      </div>

      {/* Radial glow overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,245,255,0.1) 0%, transparent 70%), " +
            "radial-gradient(ellipse 60% 40% at 100% 100%, rgba(191,0,255,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Bottom fade to body bg */}
      <div
        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
        style={{
          background: "linear-gradient(0deg, var(--abyss) 0%, transparent 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* System online badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-8"
        >
          <div className="badge-neon">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-neon-green"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            SYSTEM ONLINE · v2.0
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <GlitchText
            as="h1"
            className="text-display text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-4"
            active
          >
            FREE ONLINE TOOLS
          </GlitchText>
        </motion.div>

        {/* Typewriter subheadline */}
        <motion.p
          className="text-xl sm:text-2xl text-text-secondary font-mono mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <TypeWriter texts={TYPEWRITER_TEXTS} speed={55} deleteSpeed={25} />
        </motion.p>

        <motion.p
          className="text-sm sm:text-base text-text-muted font-mono mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          PDF · Image · Text · Developer — All free. All private. All in your browser.
        </motion.p>

        {/* Search Command Center */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="relative max-w-2xl mx-auto mb-12"
        >
          <form onSubmit={handleSubmit}>
            <div
              className={cn(
                "relative rounded-xl transition-all duration-300",
                isFocused
                  ? "shadow-[0_0_40px_rgba(0,245,255,0.25)]"
                  : "shadow-[0_0_20px_rgba(0,245,255,0.08)]"
              )}
            >
              {/* Corner brackets on search box */}
              <div className={cn("corner-bracket tl transition-opacity", isFocused ? "opacity-100" : "opacity-0")} />
              <div className={cn("corner-bracket tr transition-opacity", isFocused ? "opacity-100" : "opacity-0")} />
              <div className={cn("corner-bracket bl transition-opacity", isFocused ? "opacity-100" : "opacity-0")} />
              <div className={cn("corner-bracket br transition-opacity", isFocused ? "opacity-100" : "opacity-0")} />

              <div className="flex items-center gap-3 px-5 py-4 rounded-xl"
                style={{
                  background: "rgba(10,15,30,0.85)",
                  border: `1px solid ${isFocused ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.15)"}`,
                  backdropFilter: "blur(20px)",
                }}
              >
                <Search className={cn("w-5 h-5 flex-shrink-0 transition-colors", isFocused ? "text-neon-cyan" : "text-text-muted")} />
                <input
                  type="text"
                  placeholder="Search tools: 'pdf split', 'image compressor', 'qr scanner'..."
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                  className="flex-1 bg-transparent outline-none font-mono text-sm text-text-primary placeholder:text-text-muted"
                />
                <button
                  type="submit"
                  className="btn-solid-cyan px-4 py-1.5 text-xs rounded-lg flex-shrink-0"
                >
                  SEARCH
                </button>
              </div>
            </div>

            {/* Search results dropdown */}
            {isFocused && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50"
                style={{
                  background: "rgba(10, 15, 30, 0.98)",
                  border: "1px solid rgba(0,245,255,0.2)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                }}
              >
                {results.map((tool, i) => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-neon-cyan/5 transition-colors group border-b border-neon-cyan/5 last:border-0"
                  >
                    <span className="text-xs font-mono text-text-muted w-4">{i + 1}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-mono text-text-primary group-hover:text-neon-cyan transition-colors">
                        {tool.name}
                      </p>
                      <p className="text-xs text-text-muted">{tool.shortDesc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-neon-cyan transition-colors" />
                  </Link>
                ))}
                {query && (
                  <Link
                    href={`/tools?q=${encodeURIComponent(query)}`}
                    className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-mono text-neon-cyan/60 hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all"
                  >
                    <Search className="w-3 h-3" />
                    See all results for "{query}"
                  </Link>
                )}
              </motion.div>
            )}
          </form>

          {/* Popular suggestions */}
          {!query && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="text-xs font-mono text-text-muted">Popular:</span>
              {["PDF Split", "Image Compressor", "Word to PDF", "Hashtag Generator"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className="text-xs font-mono px-3 py-1 rounded border border-neon-cyan/15 text-text-muted hover:text-neon-cyan hover:border-neon-cyan/35 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-10"
        >
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl sm:text-3xl font-display font-black text-neon-cyan mb-1"
                style={{ textShadow: "0 0 20px rgba(0,245,255,0.5)" }}>
                {value}
              </div>
              <div className="text-xs font-mono text-text-muted uppercase tracking-wider">
                {label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-wrap justify-center gap-4"
        >
          {TRUST_BADGES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs font-mono text-text-muted">
              <Icon className="w-3.5 h-3.5 text-neon-green" />
              {text}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="w-[1px] h-8 bg-gradient-to-b from-neon-cyan/0 to-neon-cyan/40" />
          <div className="w-1 h-1 rounded-full bg-neon-cyan/40" />
        </div>
      </motion.div>
    </section>
  );
}

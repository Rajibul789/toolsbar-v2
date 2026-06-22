"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultRevealProps {
  children: React.ReactNode;
  onReset?: () => void;
  successMessage?: string;
  className?: string;
}

export function ResultReveal({
  children,
  onReset,
  successMessage = "PROCESSING COMPLETE",
  className,
}: ResultRevealProps) {
  const [phase, setPhase] = useState<"decode" | "reveal">("decode");

  useEffect(() => {
    const t = setTimeout(() => setPhase("reveal"), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-5", className)}
    >
      {/* Success header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 sm:px-5"
        style={{
          background: "rgba(0,255,136,0.06)",
          border: "1px solid rgba(0,255,136,0.2)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
            className="flex-shrink-0"
          >
            <CheckCircle2 className="w-5 h-5 text-neon-green" />
          </motion.div>
          <div className="min-w-0">
            <p className="text-sm font-mono font-semibold text-neon-green tracking-wider truncate">
              {successMessage}
            </p>
            <p className="text-xs font-mono text-text-muted truncate">
              Your file is ready to download
            </p>
          </div>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors px-3 py-1.5 rounded border border-transparent hover:border-neon-cyan/20 flex-shrink-0 whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            Process Another
          </button>
        )}
      </motion.div>

      {/* Content with decode animation */}
      <motion.div
        initial={phase === "decode" ? { filter: "blur(6px)", opacity: 0.3 } : {}}
        animate={{ filter: "blur(0px)", opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative"
      >
        {/* Scan sweep overlay (disappears after reveal) */}
        {phase === "decode" && (
          <motion.div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(0deg, transparent 0%, rgba(0,245,255,0.06) 50%, transparent 100%)",
            }}
            animate={{ top: ["-100%", "200%"] }}
            transition={{ duration: 0.7, ease: "easeIn" }}
          />
        )}
        {children}
      </motion.div>
    </motion.div>
  );
}

// ── DownloadButton ─────────────────────────────────────────────
interface DownloadButtonProps {
  onClick: () => void;
  label?: string;
  color?: "cyan" | "green" | "purple";
  className?: string;
}

export function DownloadButton({
  onClick,
  label = "Download",
  color = "green",
  className,
}: DownloadButtonProps) {
  const [clicked, setClicked] = useState(false);

  const colors = {
    cyan:   { border: "rgba(0,245,255,0.5)",   bg: "rgba(0,245,255,0.08)",   text: "#00f5ff" },
    green:  { border: "rgba(0,255,136,0.5)",   bg: "rgba(0,255,136,0.08)",   text: "#00ff88" },
    purple: { border: "rgba(191,0,255,0.5)",   bg: "rgba(191,0,255,0.08)",   text: "#bf00ff" },
  };
  const c = colors[color];

  function handleClick() {
    setClicked(true);
    onClick();
    setTimeout(() => setClicked(false), 2000);
  }

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg",
        "font-mono font-semibold text-sm transition-all duration-300",
        className
      )}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        boxShadow: `0 0 20px ${c.text}15`,
        textShadow: `0 0 10px ${c.text}60`,
      }}
    >
      {clicked ? "✓ DOWNLOADED" : `↓ ${label}`}
    </motion.button>
  );
}
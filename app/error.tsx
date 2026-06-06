"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{
        background: "var(--abyss)",
        backgroundImage:
          "linear-gradient(rgba(255,0,60,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,60,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    >
      {/* Animated warning icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="mb-8 relative"
      >
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(255,0,60,0.08)",
            border: "1px solid rgba(255,0,60,0.25)",
            boxShadow: "0 0 40px rgba(255,0,60,0.15)",
          }}
        >
          <AlertTriangle className="w-10 h-10 text-neon-red" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-2xl border border-neon-red/20"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Error status badge */}
      <div className="badge-neon-red mb-5 text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-red inline-block animate-pulse" />
        SYSTEM_ERROR · UNHANDLED_EXCEPTION
      </div>

      <h1 className="font-display text-2xl md:text-3xl font-black text-white mb-3 tracking-wider">
        SOMETHING WENT WRONG
      </h1>
      <p className="text-sm text-text-muted font-mono max-w-sm leading-relaxed mb-3">
        An unexpected error occurred. The incident has been logged and we&apos;re working on it.
      </p>

      {/* Error digest */}
      {error.digest && (
        <p className="text-[11px] font-mono text-text-muted/60 mb-8">
          Error ID:{" "}
          <span className="text-neon-red/60">{error.digest}</span>
        </p>
      )}

      {/* Terminal block */}
      <div
        className="rounded-xl p-5 mb-8 text-left max-w-sm w-full"
        style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,0,60,0.15)" }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-2 h-2 rounded-full bg-neon-red" />
          <div className="w-2 h-2 rounded-full bg-neon-yellow" />
          <div className="w-2 h-2 rounded-full bg-neon-green" />
        </div>
        <p className="text-xs font-mono">
          <span className="text-neon-red">FATAL: </span>
          <span className="text-text-muted">
            {error.message?.slice(0, 80) ?? "Unknown error occurred"}
          </span>
          <br />
          <span className="text-text-muted/50 text-[10px]">
            {new Date().toISOString()}
          </span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          onClick={reset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 text-sm font-mono font-bold px-5 py-3 rounded-lg border transition-all"
          style={{
            background: "rgba(255,0,60,0.1)",
            borderColor: "rgba(255,0,60,0.4)",
            color: "#ff003c",
          }}
        >
          <RefreshCw className="w-4 h-4" />
          RETRY
        </motion.button>
        <Link
          href="/"
          className="btn-neon flex items-center gap-2 text-sm"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { randomHex } from "@/lib/utils";

interface CyberScannerProps {
  statusText?: string;
  progress?: number;
  isActive?: boolean;
}

export function CyberScanner({
  statusText = "PROCESSING...",
  progress = 0,
  isActive = true,
}: CyberScannerProps) {
  const [hexLines, setHexLines] = useState<string[]>([]);
  const [scanPos, setScanPos] = useState(0);

  // Generate streaming hex data lines
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setHexLines((prev) => {
        const newLine = Array.from({ length: 8 }, () => randomHex(4)).join(" ");
        return [newLine, ...prev].slice(0, 8);
      });
    }, 120);
    return () => clearInterval(interval);
  }, [isActive]);

  // Animate scan position
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setScanPos((p) => (p + 1) % 100);
    }, 16);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-neon-cyan/20 bg-terminal"
         style={{ minHeight: 300 }}>

      {/* Corner brackets */}
      <div className="corner-bracket tl" />
      <div className="corner-bracket tr" />
      <div className="corner-bracket bl" />
      <div className="corner-bracket br" />

      {/* Scan beam */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
        style={{
          background: "linear-gradient(90deg, transparent, var(--neon-cyan), transparent)",
          boxShadow: "0 0 20px rgba(0,245,255,0.8), 0 0 40px rgba(0,245,255,0.4)",
        }}
        animate={{ top: ["5%", "95%", "5%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neon-cyan/10">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-neon-red"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-neon-yellow"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-neon-green"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
          />
        </div>
        <span className="text-xs font-mono text-neon-cyan/60 tracking-widest uppercase">
          SYSTEM PROCESS
        </span>
        <span className="text-xs font-mono text-text-muted">
          PID:{" "}
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {Math.floor(Math.random() * 9000) + 1000}
          </motion.span>
        </span>
      </div>

      {/* Main area */}
      <div className="flex h-full">
        {/* Left: hex data stream */}
        <div className="w-1/3 border-r border-neon-cyan/8 p-4 overflow-hidden">
          <p className="text-xs font-mono text-neon-cyan/40 mb-2 uppercase tracking-widest">
            Data Stream
          </p>
          <AnimatePresence mode="popLayout">
            {hexLines.map((line, i) => (
              <motion.div
                key={`${line}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1 - i * 0.12, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-xs font-mono mb-1"
                style={{ color: `rgba(0,255,136,${0.8 - i * 0.1})` }}
              >
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Right: status area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          {/* Spinning ring */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full ring-spin opacity-30" />
            <div className="absolute inset-2 rounded-full border border-neon-cyan/20" />
            <motion.div
              className="absolute inset-3 rounded-full border-t-2 border-neon-cyan"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-5 rounded-full border-b border-neon-purple"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono text-neon-cyan font-bold">
                {progress}%
              </span>
            </div>
          </div>

          {/* Status text */}
          <div className="text-center">
            <motion.p
              key={statusText}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-mono text-neon-cyan tracking-widest uppercase"
            >
              {statusText}
            </motion.p>
            <p className="text-xs font-mono text-text-muted mt-1">
              {randomHex(4)}.{randomHex(2)} @ {new Date().toLocaleTimeString()}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs">
            <div className="progress-cyber">
              <motion.div
                className="progress-cyber-fill"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs font-mono text-text-muted">0%</span>
              <span className="text-xs font-mono text-neon-green">{progress}%</span>
              <span className="text-xs font-mono text-text-muted">100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="px-4 py-2 border-t border-neon-cyan/8 flex items-center gap-2">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-neon-green"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
        <span className="text-xs font-mono text-text-muted">
          ENCRYPTING · PROCESSING · ANALYZING
        </span>
        <span className="ml-auto text-xs font-mono text-neon-cyan/40">
          {randomHex(8)}
        </span>
      </div>
    </div>
  );
}

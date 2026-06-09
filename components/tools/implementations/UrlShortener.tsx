"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Copy, ExternalLink, X, Zap } from "lucide-react";
import { toast } from "sonner";

interface ShortResult { short: string; original: string; }

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

export function UrlShortener() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ShortResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleShorten() {
    const trimmed = url.trim();
    if (!trimmed) { toast.error("Please enter a URL."); return; }
    if (!isValidUrl(trimmed)) { toast.error("Please enter a valid URL starting with http:// or https://"); return; }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/url-shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Shortening failed");
      }

      const data = await res.json();
      setResults((prev) => [{ short: data.short, original: trimmed }, ...prev].slice(0, 10));
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to shorten URL. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard!"));
  }

  function removeResult(i: number) {
    setResults((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-6">
      {/* Input form */}
      <div className="space-y-3">
        <label className="text-xs font-mono text-text-muted uppercase tracking-wider block">
          Enter Long URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleShorten()}
              placeholder="https://your-very-long-url.com/with/path?and=params"
              className="input-cyber w-full pl-10"
            />
          </div>
          <motion.button
            onClick={handleShorten}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-neon flex items-center gap-2 px-5 py-3 font-mono font-bold text-sm tracking-wider disabled:opacity-50 flex-shrink-0"
          >
            {isLoading ? (
              <motion.div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isLoading ? "SHORTENING..." : "SHORTEN"}
          </motion.button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-xs font-mono text-neon-red flex items-center gap-1.5">
              ⚠ {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-2 text-[11px] font-mono text-text-muted leading-relaxed"
        style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)", borderRadius: 8, padding: "10px 14px" }}>
        <span className="text-neon-cyan mt-0.5">ℹ</span>
        <span>Links are shortened via our Cloudflare Worker. No login required. Up to 10 recent results shown below.</span>
      </div>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-xs font-mono text-text-muted uppercase tracking-wider">Recent Links</p>
            {results.map((r, i) => (
              <motion.div
                key={r.short}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i === 0 ? 0 : 0 }}
                className="rounded-xl p-4 space-y-2.5"
                style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.12)" }}
              >
                {/* Short URL */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Link2 className="w-3.5 h-3.5 text-neon-cyan flex-shrink-0" />
                    <span className="text-sm font-mono font-bold text-neon-cyan truncate">{r.short}</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => copyToClipboard(r.short)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded border text-[11px] font-mono transition-all"
                      style={{ borderColor: "rgba(0,245,255,0.25)", color: "#00f5ff", background: "rgba(0,245,255,0.06)" }}>
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <a href={r.short} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded border text-[11px] font-mono transition-all"
                      style={{ borderColor: "rgba(0,245,255,0.15)", color: "#94a3b8" }}>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button onClick={() => removeResult(i)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded border text-[11px] font-mono transition-all border-transparent text-text-muted hover:text-neon-red">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Original URL */}
                <p className="text-[11px] font-mono text-text-muted truncate pl-5.5">
                  ↳ {r.original}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

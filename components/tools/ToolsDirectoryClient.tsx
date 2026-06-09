"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchTools } from "@/config/tools.config";
import { ToolCardCompact } from "@/components/tools/ToolCard";

export function ToolsDirectoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState(searchTools(query));

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    setResults(searchTools(q));
  }, [searchParams]);

  function handleChange(value: string) {
    setQuery(value);
    setResults(searchTools(value));
    const url = value.trim() ? `/tools?q=${encodeURIComponent(value)}` : "/tools";
    router.replace(url, { scroll: false });
  }

  function clear() {
    handleChange("");
  }

  const isSearching = query.trim().length > 0;

  return (
    <div className="max-w-xl mx-auto">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search tools by name or function..."
          className="input-cyber w-full pl-11 pr-10 py-3.5 text-sm"
          style={{ fontSize: "0.9rem" }}
          autoFocus={!!searchParams.get("q")}
        />
        <AnimatePresence>
          {isSearching && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Search results */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-3 rounded-xl overflow-hidden text-left"
            style={{
              background: "rgba(10,15,30,0.98)",
              border: "1px solid rgba(0,245,255,0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
            }}
          >
            {results.length > 0 ? (
              <>
                <div className="px-4 py-2.5 border-b border-neon-cyan/8">
                  <span className="text-[11px] font-mono text-text-muted">
                    {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                  </span>
                </div>
                <div className="divide-y divide-neon-cyan/5 max-h-80 overflow-y-auto">
                  {results.map((tool) => (
                    <ToolCardCompact key={tool.slug} tool={tool} />
                  ))}
                </div>
              </>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-mono text-text-muted">
                  No tools found for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs font-mono text-text-muted/60 mt-1">
                  Try &ldquo;pdf&rdquo;, &ldquo;image&rdquo;, or &ldquo;convert&rdquo;
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

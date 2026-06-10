"use client";

import { useState } from "react";
import { Search, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Post {
  slug: string; title: string; excerpt: string;
  category: string; categorySlug: string;
  readTime: string; date: string; tags: string[];
}

export function BlogSearch({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState("");

  const results = query.trim().length < 2 ? [] : posts.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative max-w-xl mx-auto mb-10">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles by title, tag, or category..."
          className="input-cyber w-full pl-11 pr-10 py-3.5 text-sm" />
        <AnimatePresence>
          {query && (
            <motion.button initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan">
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {query.trim().length >= 2 && (
          <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl overflow-hidden"
            style={{ background:"rgba(10,15,30,0.98)", border:"1px solid rgba(0,245,255,0.2)", boxShadow:"0 20px 60px rgba(0,0,0,0.8)" }}>
            {results.length > 0 ? (
              <>
                <div className="px-4 py-2.5 border-b border-neon-cyan/8">
                  <span className="text-[11px] font-mono text-text-muted">
                    {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                  </span>
                </div>
                {results.slice(0, 6).map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} onClick={() => setQuery("")}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-neon-cyan/5 transition-colors border-b border-neon-cyan/5 last:border-0">
                    <span className="text-sm font-mono text-text-primary hover:text-neon-cyan transition-colors line-clamp-1">{post.title}</span>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
                      <span className="text-neon-cyan/60">{post.category}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{post.readTime}</span>
                    </div>
                  </Link>
                ))}
              </>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-mono text-text-muted">No articles found for &ldquo;{query}&rdquo;</p>
                <p className="text-[11px] font-mono text-text-muted/60 mt-1">Try a different keyword</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
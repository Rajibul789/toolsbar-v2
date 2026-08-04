"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";

const ACCENT_COLORS = ["#00f5ff", "#bf00ff", "#00ff88"];

export interface BlogPreviewPost {
  slug: string;
  title: string;
  excerpt: string;
  category: { name: string; slug: string } | null;
  readTimeMin: number;
  publishedAt: string | Date | null;
}

export function BlogPreviewSection({ posts }: { posts: BlogPreviewPost[] }) {
  const items = posts.slice(0, 3);
  if (items.length === 0) return null;

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between mb-10"
      >
        <div>
          <div className="section-label mb-3">Blog</div>
          <h2 className="font-display text-3xl font-black text-white">
            LATEST GUIDES
          </h2>
        </div>
        <Link
          href="/blog"
          className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-neon-cyan/70 hover:text-neon-cyan transition-colors group"
        >
          All articles
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((post, i) => {
          const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
          const date = post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "—";
          return (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-panel overflow-hidden group hover:shadow-glass-hover transition-all duration-300 hover:-translate-y-1"
            >
              {/* Color bar */}
              <div
                className="h-0.5 w-full"
                style={{ background: `linear-gradient(90deg, ${color}80, transparent)` }}
              />

              <div className="p-5">
                {/* Meta */}
                <div className="flex items-center gap-3 mb-3">
                  {post.category && (
                    <>
                      <Link
                        href={`/blog/category/${post.category.slug}`}
                        className="text-[11px] font-mono transition-colors"
                        style={{ color }}
                      >
                        {post.category.name}
                      </Link>
                      <span className="text-text-muted/40 text-xs">·</span>
                    </>
                  )}
                  <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                    <Clock className="w-3 h-3" />
                    {post.readTimeMin} min
                  </div>
                </div>

                {/* Title */}
                <Link href={`/blog/${post.slug}`}>
                  <h3 className="font-display text-sm font-bold text-white group-hover:text-neon-cyan transition-colors leading-snug mb-3 tracking-wide">
                    {post.title.toUpperCase()}
                  </h3>
                </Link>

                <p className="text-xs text-text-muted font-mono leading-relaxed mb-4 line-clamp-2">
                  {post.excerpt}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                    <Calendar className="w-3 h-3" />
                    {date}
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-[11px] font-mono flex items-center gap-1 transition-all"
                    style={{ color: `${color}80` }}
                  >
                    Read
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Mobile "all articles" link */}
      <div className="text-center mt-8 sm:hidden">
        <Link href="/blog" className="btn-neon text-sm inline-flex items-center gap-2">
          View All Articles <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
import type { Metadata } from "next";
import { BarChart3, FileText, Wrench, TrendingUp, Eye, Zap, BookOpen, Settings } from "lucide-react";
import Link from "next/link";
import { TOOLS_CONFIG, TOOL_CATEGORIES } from "@/config/tools.config";
import { getToolStateMap } from "@/lib/data/tools";
import prisma from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin Dashboard | ToolsBar",
  robots: { index: false },
};

const QUICK_LINKS = [
  { label: "Manage Tools",     href: "/admin/tools",    icon: Wrench,  color: "#00f5ff", desc: `${TOOLS_CONFIG.length} tools configured` },
  { label: "Blog Posts",       href: "/admin/blog",     icon: BookOpen, color: "#00ff88", desc: "Manage articles & drafts" },
  { label: "Homepage Builder", href: "/admin/homepage", icon: Eye,     color: "#bf00ff", desc: "Configure featured tools, hero" },
  { label: "SEO Settings",     href: "/admin/seo",      icon: TrendingUp, color: "#ff6600", desc: "Global metadata & schema" },
  { label: "Categories",       href: "/admin/categories", icon: FileText, color: "#ffcc00", desc: "Blog & tool categories" },
  { label: "Settings",         href: "/admin/settings", icon: Settings, color: "#ff00aa", desc: "Admin preferences & security" },
];

export default async function AdminDashboard() {
  // Merge live DB overrides with static config, same as the Tools admin page —
  // so these counts match what's actually toggled on, not just the config file.
  const [toolStates, dbOk] = await Promise.all([
    getToolStateMap(),
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
  ]);
  const mergedTools = TOOLS_CONFIG.map((t) => ({ ...t, ...(toolStates[t.slug] ?? {}) }));
  const featuredCount = mergedTools.filter((t) => t.isFeatured).length;
  const newCount      = mergedTools.filter((t) => t.isNew).length;
  const now = new Date();

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.25)" }}
          >
            <Zap className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h1 className="font-display text-xl font-black text-white tracking-widest">
              ADMIN DASHBOARD
            </h1>
            <p className="text-xs font-mono text-text-muted">
              ToolsBar Control Center · {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Tools",    value: TOOLS_CONFIG.length,     color: "#00f5ff", icon: Wrench },
          { label: "Featured Tools", value: featuredCount,           color: "#bf00ff", icon: BarChart3 },
          { label: "New Badges",     value: newCount,                color: "#00ff88", icon: TrendingUp },
          { label: "Categories",     value: TOOL_CATEGORIES.length,  color: "#ff6600", icon: FileText },
        ].map(({ label, value, color, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{
              background: "rgba(10,15,30,0.8)",
              border: `1px solid ${color}18`,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <Icon className="w-4 h-4" style={{ color, opacity: 0.7 }} />
            </div>
            <p className="text-2xl font-display font-black" style={{ color }}>
              {value}
            </p>
            <p className="text-xs font-mono text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <h2 className="font-display text-sm font-bold tracking-widest text-text-muted uppercase mb-4">
        Quick Access
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_LINKS.map(({ label, href, icon: Icon, color, desc }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl p-5 group transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: "rgba(10,15,30,0.8)",
              border: "1px solid rgba(0,245,255,0.08)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}12`, border: `1px solid ${color}25` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="font-mono text-sm font-semibold text-text-primary group-hover:text-white transition-colors">
                {label}
              </span>
            </div>
            <p className="text-xs font-mono text-text-muted">{desc}</p>
          </Link>
        ))}
      </div>

      {/* System status */}
      <Link
        href="/admin/settings"
        className="mt-8 block rounded-xl p-5 transition-colors"
        style={dbOk
          ? { background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.12)" }
          : { background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={dbOk
                ? { background: "#00ff88", boxShadow: "0 0 6px rgba(0,255,136,0.8)" }
                : { background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.8)" }}
            />
            <span className="text-xs font-mono font-semibold tracking-wider" style={{ color: dbOk ? "#00ff88" : "#ef4444" }}>
              {dbOk ? "ALL SYSTEMS OPERATIONAL" : "DATABASE UNREACHABLE"}
            </span>
          </div>
          <span className="text-xs font-mono text-text-muted">
            Checked: {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · Full health check →
          </span>
        </div>
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, Search, Zap, FileText, Image, Type, Share2,
  Terminal, ChevronDown, Home, BookOpen, LayoutGrid,
  History, Info, Mail, Shield, FileCheck, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlitchText } from "@/components/animations/GlitchText";

/* ─────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────── */

/** Desktop nav item. dropdown and activePaths are optional. */
interface NavItem {
  label:       string;
  href:        string;
  matchStart:  boolean;
  /** If set, the item renders as a dropdown trigger instead of a link. */
  dropdown?:   "tools" | "categories";
  /** Additional pathnames that mark this item as active (besides href). */
  activePaths?: string[];
}

/** Mobile nav item — same as NavItem but always has an icon and optional legal flag. */
interface MobileNavItem {
  label:        string;
  href:         string;
  icon:         React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  matchStart:   boolean;
  activePaths?: string[];
  isLegal?:     boolean;
}

/* ─────────────────────────────────────────────────
   NAV DEFINITIONS
   Order matches the Part 4 requirement exactly:
   1.Home 2.Tools 3.Blog 4.Categories 5.History
   6.About 7.Contact 8.Privacy Policy 9.Terms 10.Disclaimer
───────────────────────────────────────────────── */
const TOOL_CATEGORIES = [
  { label: "PDF Tools",       href: "/tool-category/pdf-tools",       icon: FileText, color: "#00f5ff" },
  { label: "Image Tools",     href: "/tool-category/image-tools",     icon: Image,    color: "#bf00ff" },
  { label: "Text & Docs",     href: "/tool-category/text-tools",      icon: Type,     color: "#00ff88" },
  { label: "Social Tools",    href: "/tool-category/social-tools",    icon: Share2,   color: "#ff00aa" },
  { label: "Developer Tools", href: "/tool-category/developer-tools", icon: Terminal, color: "#ff6600" },
];

const LEGAL_ITEMS = [
  { label: "Privacy Policy", href: "/privacy-policy", icon: Shield,      color: "#00f5ff" },
  { label: "Terms",          href: "/terms",          icon: FileCheck,   color: "#00ff88" },
  { label: "Disclaimer",     href: "/disclaimer",     icon: AlertCircle, color: "#ff6600" },
];

/** Primary desktop nav items (shown in header bar). */
const PRIMARY_NAV: NavItem[] = [
  { label: "Home",       href: "/",        matchStart: false },
  { label: "Tools",      href: "/tools",   matchStart: true,  dropdown: "tools" },
  { label: "Blog",       href: "/blog",    matchStart: true },
  { label: "Categories", href: "/tools",   matchStart: true,  dropdown: "categories", activePaths: ["/tool-category"] },
  { label: "History",    href: "/history", matchStart: false },
  { label: "About",      href: "/about",   matchStart: false },
  { label: "Contact",    href: "/contact", matchStart: false },
];

/** Legal items appear in the "More" dropdown on desktop, separate section on mobile. */
const DESKTOP_MORE_DROPDOWN = "more";

/** All 10 items for mobile (in required order). */
const ALL_MOBILE_ITEMS: MobileNavItem[] = [
  { label: "Home",           href: "/",               icon: Home,        matchStart: false },
  { label: "Tools",          href: "/tools",          icon: Search,      matchStart: true  },
  { label: "Blog",           href: "/blog",           icon: BookOpen,    matchStart: true  },
  { label: "Categories",     href: "/tools",          icon: LayoutGrid,  matchStart: true,  activePaths: ["/tool-category"] },
  { label: "History",        href: "/history",        icon: History,     matchStart: false },
  { label: "About",          href: "/about",          icon: Info,        matchStart: false },
  { label: "Contact",        href: "/contact",        icon: Mail,        matchStart: false },
  { label: "Privacy Policy", href: "/privacy-policy", icon: Shield,      matchStart: false, isLegal: true },
  { label: "Terms",          href: "/terms",          icon: FileCheck,   matchStart: false, isLegal: true },
  { label: "Disclaimer",     href: "/disclaimer",     icon: AlertCircle, matchStart: false, isLegal: true },
];

function isActive(
  pathname: string,
  href: string,
  matchStart: boolean,
  activePaths?: string[]
): boolean {
  // Extra paths that count as active for this item
  if (activePaths?.some((p) => pathname.startsWith(p))) return true;
  if (!matchStart) return pathname === href;
  // For startsWith, avoid "/" matching everything
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled]         = useState(false);
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close everything on navigation
  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  // Close mobile menu on backdrop click / escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-neon-cyan/10 backdrop-blur-glass"
          : "border-b border-transparent"
      )}
      style={{
        background: isScrolled ? "rgba(1, 6, 16, 0.92)" : "transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ─────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative w-8 h-8">
              <div
                className="w-8 h-8 rounded border border-neon-cyan/50 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(0,245,255,0.15), rgba(0,245,255,0.05))",
                  boxShadow: "0 0 15px rgba(0,245,255,0.2)",
                }}
              >
                <Zap className="w-4 h-4 text-neon-cyan" />
              </div>
              <motion.div
                className="absolute inset-0 rounded border border-neon-cyan/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <GlitchText
              className="font-display text-lg font-bold tracking-wider text-white"
              active={false}
            >
              TOOLSBAR
            </GlitchText>
          </Link>

          {/* ── Desktop Nav ──────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {PRIMARY_NAV.map((item) => {
              const active = isActive(pathname, item.href, item.matchStart, item.activePaths);

              /* --- Tools dropdown --- */
              if (item.dropdown === "tools") {
                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => setActiveDropdown("tools")}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <button
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-200",
                        active || activeDropdown === "tools"
                          ? "text-neon-cyan"
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {item.label}
                      <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", activeDropdown === "tools" && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {activeDropdown === "tools" && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 mt-1 w-52 rounded-xl overflow-hidden"
                          style={{
                            background: "rgba(10, 15, 30, 0.97)",
                            border: "1px solid rgba(0,245,255,0.15)",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(0,245,255,0.05)",
                            backdropFilter: "blur(20px)",
                          }}
                          onMouseEnter={() => setActiveDropdown("tools")}
                          onMouseLeave={() => setActiveDropdown(null)}
                        >
                          {TOOL_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            return (
                              <Link
                                key={cat.href}
                                href={cat.href}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2.5 text-sm font-mono transition-all duration-150 group/item",
                                  pathname === cat.href ? "bg-neon-cyan/5" : "hover:bg-white/3"
                                )}
                                style={{ color: pathname === cat.href ? cat.color : "var(--text-secondary)" }}
                              >
                                <Icon
                                  className="w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover/item:scale-110"
                                  style={{ color: cat.color }}
                                />
                                <span className="group-hover/item:text-white transition-colors truncate">
                                  {cat.label}
                                </span>
                              </Link>
                            );
                          })}
                          <div className="border-t border-neon-cyan/8 px-4 py-2">
                            <Link
                              href="/tools"
                              className="text-xs font-mono text-neon-cyan/60 hover:text-neon-cyan transition-colors"
                            >
                              View all tools →
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              /* --- Categories dropdown --- */
              if (item.dropdown === "categories") {
                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => setActiveDropdown("categories")}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <button
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-200",
                        active || activeDropdown === "categories"
                          ? "text-neon-cyan"
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {item.label}
                      <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", activeDropdown === "categories" && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {activeDropdown === "categories" && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 mt-1 w-52 rounded-xl overflow-hidden"
                          style={{
                            background: "rgba(10, 15, 30, 0.97)",
                            border: "1px solid rgba(0,245,255,0.15)",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(0,245,255,0.05)",
                            backdropFilter: "blur(20px)",
                          }}
                          onMouseEnter={() => setActiveDropdown("categories")}
                          onMouseLeave={() => setActiveDropdown(null)}
                        >
                          {TOOL_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const catActive = pathname.startsWith(cat.href);
                            return (
                              <Link
                                key={cat.href}
                                href={cat.href}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2.5 text-sm font-mono transition-all duration-150 group/item",
                                  catActive ? "bg-neon-cyan/5" : "hover:bg-white/3"
                                )}
                                style={{ color: catActive ? cat.color : "var(--text-secondary)" }}
                              >
                                <Icon
                                  className="w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover/item:scale-110"
                                  style={{ color: cat.color }}
                                />
                                <span className="group-hover/item:text-white transition-colors truncate">
                                  {cat.label}
                                </span>
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              /* --- Plain link --- */
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-mono transition-all duration-200",
                    active
                      ? "text-neon-cyan"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* ── More (Legal) dropdown ── */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown(DESKTOP_MORE_DROPDOWN)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-200",
                  LEGAL_ITEMS.some((l) => pathname === l.href) || activeDropdown === DESKTOP_MORE_DROPDOWN
                    ? "text-neon-cyan"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                More
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", activeDropdown === DESKTOP_MORE_DROPDOWN && "rotate-180")} />
              </button>

              <AnimatePresence>
                {activeDropdown === DESKTOP_MORE_DROPDOWN && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-1 w-48 rounded-xl overflow-hidden"
                    style={{
                      background: "rgba(10, 15, 30, 0.97)",
                      border: "1px solid rgba(0,245,255,0.15)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(0,245,255,0.05)",
                      backdropFilter: "blur(20px)",
                    }}
                    onMouseEnter={() => setActiveDropdown(DESKTOP_MORE_DROPDOWN)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    {LEGAL_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 text-sm font-mono transition-all duration-150 group/item",
                            active ? "bg-neon-cyan/5" : "hover:bg-white/3"
                          )}
                          style={{ color: active ? item.color : "var(--text-secondary)" }}
                        >
                          <Icon
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: item.color }}
                          />
                          <span className="group-hover/item:text-white transition-colors">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* ── Right actions ────────────────────────── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/tools"
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-mono btn-neon"
            >
              <Search className="w-3.5 h-3.5" />
              Search Tools
            </Link>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg border border-neon-cyan/20 text-text-secondary hover:text-neon-cyan hover:border-neon-cyan/40 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ──────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="lg:hidden border-t border-neon-cyan/10 overflow-hidden"
            style={{ background: "rgba(1, 6, 16, 0.98)" }}
          >
            <div className="px-4 py-3">

              {/* Primary links (1-7) */}
              <div className="space-y-0.5 mb-2">
                {ALL_MOBILE_ITEMS.filter((i) => !i.isLegal).map((item) => {
                  const Icon = item.icon;
                  const active = isActive(
                    pathname,
                    item.href,
                    item.matchStart,
                    item.activePaths
                  );
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-sm transition-all",
                        active
                          ? "text-neon-cyan bg-neon-cyan/8 border border-neon-cyan/20"
                          : "text-text-secondary hover:text-neon-cyan hover:bg-neon-cyan/5 border border-transparent"
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: active ? "var(--neon-cyan)" : "var(--text-muted)" }}
                      />
                      {item.label}
                      {active && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-cyan flex-shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-neon-cyan/8 my-3" />

              {/* Legal links (8-10) */}
              <p className="px-4 text-[10px] font-mono text-text-muted uppercase tracking-widest mb-2">
                Legal
              </p>
              <div className="space-y-0.5">
                {ALL_MOBILE_ITEMS.filter((i) => i.isLegal).map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg font-mono text-xs transition-all",
                        active
                          ? "text-neon-cyan bg-neon-cyan/8 border border-neon-cyan/20"
                          : "text-text-muted hover:text-text-primary hover:bg-white/3 border border-transparent"
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {/* Search shortcut */}
              <div className="mt-4 pt-3 border-t border-neon-cyan/8">
                <Link
                  href="/tools"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg btn-neon text-sm font-mono"
                  onClick={() => setMobileOpen(false)}
                >
                  <Search className="w-4 h-4" />
                  Search All Tools
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

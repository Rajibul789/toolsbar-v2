"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, Search, Zap, FileText, Image, Type, Share2, Terminal, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlitchText } from "@/components/animations/GlitchText";

const NAV_ITEMS = [
  {
    label: "Tools",
    href: "/tools",
    children: [
      { label: "PDF Tools",        href: "/tools/pdf-tools",       icon: FileText, color: "#00f5ff" },
      { label: "Image Tools",      href: "/tools/image-tools",     icon: Image,    color: "#bf00ff" },
      { label: "Text Tools",       href: "/tools/text-tools",      icon: Type,     color: "#00ff88" },
      { label: "Social Tools",     href: "/tools/social-tools",    icon: Share2,   color: "#ff00aa" },
      { label: "Developer Tools",  href: "/tools/developer-tools", icon: Terminal, color: "#ff6600" },
    ],
  },
  { label: "Blog",    href: "/blog" },
  { label: "History", href: "/history" },
  { label: "About",   href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-neon-cyan/10 backdrop-blur-glass"
          : "border-b border-transparent"
      )}
      style={{
        background: isScrolled
          ? "rgba(1, 6, 16, 0.92)"
          : "transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
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

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="relative">
                {item.children ? (
                  <button
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-mono transition-all duration-200",
                      activeDropdown === item.label
                        ? "text-neon-cyan"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                    onMouseEnter={() => setActiveDropdown(item.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "w-3 h-3 transition-transform duration-200",
                        activeDropdown === item.label && "rotate-180"
                      )}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-mono transition-all duration-200",
                      pathname === item.href
                        ? "text-neon-cyan"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {item.label}
                  </Link>
                )}

                {/* Dropdown */}
                {item.children && (
                  <AnimatePresence>
                    {activeDropdown === item.label && (
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
                        onMouseEnter={() => setActiveDropdown(item.label)}
                        onMouseLeave={() => setActiveDropdown(null)}
                      >
                        {item.children.map((child) => {
                          const Icon = child.icon;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="flex items-center gap-3 px-4 py-3 text-sm font-mono transition-all duration-150 group/item"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <Icon
                                className="w-4 h-4 transition-all duration-150 group-hover/item:scale-110"
                                style={{ color: child.color }}
                              />
                              <span className="group-hover/item:text-white transition-colors">
                                {child.label}
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
                )}
              </div>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/tools"
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-mono btn-neon"
            >
              <Search className="w-3.5 h-3.5" />
              Search Tools
            </Link>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 rounded-lg border border-neon-cyan/20 text-text-secondary hover:text-neon-cyan hover:border-neon-cyan/40 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-5 h-5" />
                  </motion.span>
                ) : (
                  <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="w-5 h-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden border-t border-neon-cyan/10 overflow-hidden"
            style={{ background: "rgba(1, 6, 16, 0.98)" }}
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_ITEMS.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    className="block px-4 py-3 rounded-lg font-mono text-sm text-text-secondary hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all"
                  >
                    {item.label}
                  </Link>
                  {item.children?.map((child) => {
                    const Icon = child.icon;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="flex items-center gap-2 pl-8 pr-4 py-2 font-mono text-xs text-text-muted hover:text-text-primary transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: child.color }} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

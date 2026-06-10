import Link from "next/link";
import { Zap, Github, Twitter } from "lucide-react";
import { TOOLS_CONFIG, TOOL_CATEGORIES } from "@/config/tools.config";

const LEGAL_LINKS = [
  { label: "Privacy Policy",  href: "/privacy-policy" },
  { label: "Terms of Use",    href: "/terms" },
  { label: "Disclaimer",      href: "/disclaimer" },
  { label: "Cookie Policy",   href: "/cookie-policy" },
];

const COMPANY_LINKS = [
  { label: "About",   href: "/about" },
  { label: "Blog",    href: "/blog" },
  { label: "History", href: "/history" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  const toolsByCategory = TOOL_CATEGORIES.map((cat) => ({
    ...cat,
    tools: TOOLS_CONFIG.filter((t) => t.category === cat.id).slice(0, 4),
  }));

  return (
    <footer
      className="relative border-t mt-20"
      style={{ borderColor: "rgba(0,245,255,0.08)" }}
    >
      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.2), transparent)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-16">
          {/* Brand col */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div
                className="w-7 h-7 rounded border border-neon-cyan/40 flex items-center justify-center"
                style={{ background: "rgba(0,245,255,0.1)" }}
              >
                <Zap className="w-3.5 h-3.5 text-neon-cyan" />
              </div>
              <span className="font-display text-base font-bold text-white tracking-widest">
                TOOLSBAR
              </span>
            </Link>
            <p className="text-xs text-text-muted font-mono leading-relaxed mb-5 max-w-xs">
              Free, privacy-first online tools. 15+ tools for PDF, images,
              documents, and developers. All browser-based. No uploads. No
              signups.
            </p>

            {/* Terminal status */}
            <div
              className="rounded-lg px-4 py-3 inline-block"
              style={{
                background: "rgba(0,255,136,0.05)",
                border: "1px solid rgba(0,255,136,0.15)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-neon-green"
                  style={{ boxShadow: "0 0 6px rgba(0,255,136,0.8)" }}
                />
                <span className="text-xs font-mono text-neon-green">
                  ALL SYSTEMS OPERATIONAL
                </span>
              </div>
            </div>

            {/* Social */}
            <div className="flex gap-3 mt-5">
              <a
                href="https://github.com/toolsbar"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-neon-cyan/15 text-text-muted hover:text-neon-cyan hover:border-neon-cyan/35 transition-all"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://twitter.com/toolsbar"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-neon-cyan/15 text-text-muted hover:text-neon-cyan hover:border-neon-cyan/35 transition-all"
              >
                <Twitter className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Tools columns: show first 2 categories */}
          {toolsByCategory.slice(0, 2).map((cat) => (
            <div key={cat.id} className="lg:col-span-1">
              <h4 className="text-xs font-display font-bold tracking-widest text-white/80 uppercase mb-4">
                {cat.name}
              </h4>
              <ul className="space-y-2">
                {cat.tools.map((tool) => (
                  <li key={tool.slug}>
                    <Link
                      href={`/tools/${tool.slug}`}
                      className="text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors"
                    >
                      {tool.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={`/tool-category/${cat.id}`}
                    className="text-xs font-mono text-neon-cyan/50 hover:text-neon-cyan transition-colors"
                  >
                    View all →
                  </Link>
                </li>
              </ul>
            </div>
          ))}

          {/* Company */}
          <div className="lg:col-span-1">
            <h4 className="text-xs font-display font-bold tracking-widest text-white/80 uppercase mb-4">
              Company
            </h4>
            <ul className="space-y-2">
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-1">
            <h4 className="text-xs font-display font-bold tracking-widest text-white/80 uppercase mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderColor: "rgba(0,245,255,0.06)" }}
        >
          <p className="text-xs font-mono text-text-muted">
            © {new Date().getFullYear()} ToolsBar. All rights reserved.
          </p>
          <p className="text-xs font-mono text-text-muted">
            Made with{" "}
            <span className="text-neon-red">♥</span>
            {" "}using Next.js 15 · Processing runs in{" "}
            <span className="text-neon-green">your browser</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
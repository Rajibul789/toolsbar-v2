import type { Metadata } from "next";
import { Shield, Zap, Lock, Globe, Code2, Users } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "About ToolsBar – Free Browser-Based Online Tools",
  description:
    "Learn about ToolsBar — who we are, why we built a privacy-first tool platform, and how our tools work completely in your browser without uploading your files.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  { icon: Lock,   title: "Privacy by Design",    desc: "We designed ToolsBar around a single principle: your files should never leave your device. Every tool that can run in-browser does exactly that.",            color: "#00f5ff" },
  { icon: Zap,    title: "Speed First",           desc: "No upload queues. No server processing delays. Most operations complete in under two seconds — directly on your hardware, using your own CPU.",           color: "#ffcc00" },
  { icon: Shield, title: "Zero Accounts",         desc: "We believe useful tools shouldn't require an email address. Open a tool, use it, leave. No sign-ups, no tracking, no friction.",                           color: "#00ff88" },
  { icon: Globe,  title: "Accessible to All",     desc: "ToolsBar is free for everyone — no premium tiers, no usage caps, no paywalled features. Every tool is fully available on every device.",                   color: "#bf00ff" },
  { icon: Code2,  title: "Open Source Libraries", desc: "Our tools are built on trusted open-source libraries: PDF-Lib, Tesseract.js, Mammoth, pdfjs-dist, and more. Transparent, auditable processing.",          color: "#ff6600" },
  { icon: Users,  title: "Community Driven",      desc: "We listen to our users. New tools and improvements are prioritized based on community requests. Have an idea? We want to hear it.",                        color: "#ff00aa" },
];

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ToolsBar",
  url: "https://toolsbar.com",
  description: "Free, privacy-first online tools platform.",
  foundingDate: "2024",
  email: "hello@toolsbar.com",
  sameAs: ["https://twitter.com/toolsbar", "https://github.com/toolsbar"],
};

export default function AboutPage() {
  return (
    <>
      <JsonLd data={orgSchema} />

      <div className="min-h-screen pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="section-label justify-center mb-4">Our Story</div>
            <h1 className="font-display text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
              TOOLS THAT RESPECT
              <br />
              <span className="text-neon-cyan" style={{ textShadow: "0 0 30px rgba(0,245,255,0.4)" }}>
                YOUR PRIVACY
              </span>
            </h1>
            <p className="text-text-muted font-mono text-base leading-relaxed max-w-2xl mx-auto">
              ToolsBar was born from a simple frustration: why do free online tools require
              you to upload your private documents to unknown servers? We built something different.
            </p>
          </div>

          {/* Mission */}
          <div
            className="glass-panel p-8 mb-12 relative overflow-hidden"
            style={{ borderColor: "rgba(0,245,255,0.12)" }}
          >
            <div className="corner-bracket tl" />
            <div className="corner-bracket tr" />
            <div className="corner-bracket bl" />
            <div className="corner-bracket br" />

            <div
              className="text-[10px] font-mono px-2.5 py-1 rounded inline-flex items-center gap-1.5 mb-4"
              style={{ background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)", color: "#00f5ff" }}
            >
              // MISSION
            </div>
            <p className="text-text-primary font-mono text-base leading-relaxed mb-4">
              Our mission is to provide every person on the internet with access to
              powerful, professional-grade file processing tools — completely free, completely
              private, and completely in their browser.
            </p>
            <p className="text-text-muted font-mono text-sm leading-relaxed">
              When you use ToolsBar to split a PDF, compress an image, or convert a Word document,
              that work happens inside your own browser using your own device's processing power.
              We never see your files. We can't — because they never reach us.
            </p>
          </div>

          {/* Values grid */}
          <h2 className="font-display text-2xl font-black text-white tracking-wider mb-8">
            WHAT WE STAND FOR
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
            {VALUES.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="glass-panel p-6"
                style={{ borderColor: `${color}12` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}10`, border: `1px solid ${color}25` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold tracking-widest text-white mb-2">
                      {title.toUpperCase()}
                    </h3>
                    <p className="text-xs text-text-muted font-mono leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* How we make money */}
          <div
            className="rounded-xl p-6 mb-12"
            style={{ background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.12)" }}
          >
            <h2 className="font-display text-sm font-bold tracking-widest text-neon-green mb-3">
              HOW WE STAY FREE
            </h2>
            <p className="text-sm text-text-muted font-mono leading-relaxed">
              ToolsBar is supported by non-intrusive display advertising (Google AdSense).
              Ads appear in designated areas of the site — never inside tool interfaces,
              never blocking your work. This keeps every tool 100% free, forever.
            </p>
          </div>

          {/* Tech stack */}
          <div className="glass-panel p-6">
            <h2 className="font-display text-sm font-bold tracking-widest text-white mb-4">
              BUILT ON OPEN SOURCE
            </h2>
            <p className="text-sm text-text-muted font-mono leading-relaxed mb-4">
              ToolsBar is built with Next.js 15, React 19, and TypeScript. All file processing
              relies on open-source libraries: PDF-Lib for PDF operations, Tesseract.js for OCR,
              Mammoth for DOCX conversion, pdfjs-dist for PDF reading, and JSZip for archiving.
            </p>
            <p className="text-sm text-text-muted font-mono leading-relaxed">
              We believe in transparency. The libraries we use are battle-tested, actively maintained,
              and auditable by anyone — no black boxes, no hidden processing.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

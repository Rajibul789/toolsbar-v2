"use client";

import { motion } from "framer-motion";
import { Lock, Zap, Globe, Shield, Code2, RefreshCw } from "lucide-react";

const FEATURES = [
  {
    icon: Lock,
    title: "Zero Server Uploads",
    desc: "Every tool processes files locally in your browser. Your data never leaves your device.",
    color: "#00f5ff",
    detail: "Powered by WebAssembly & modern browser APIs",
  },
  {
    icon: Zap,
    title: "Instant Processing",
    desc: "No queues, no waiting. Most operations complete in under 2 seconds.",
    color: "#ffcc00",
    detail: "Optimized algorithms, no server round-trips",
  },
  {
    icon: Shield,
    title: "Privacy First",
    desc: "We have no access to your files. No logs, no analytics on file contents.",
    color: "#00ff88",
    detail: "GDPR compliant by design",
  },
  {
    icon: Globe,
    title: "No Account Required",
    desc: "Open a tool, use it, done. No sign-ups, no emails, no friction.",
    color: "#bf00ff",
    detail: "Completely anonymous usage",
  },
  {
    icon: Code2,
    title: "Open-Source Libraries",
    desc: "Built on proven open-source tech: PDF-Lib, Tesseract.js, Mammoth, and more.",
    color: "#ff6600",
    detail: "Transparent, auditable processing",
  },
  {
    icon: RefreshCw,
    title: "Always Improving",
    desc: "New tools added regularly. Existing tools get upgraded and optimized.",
    color: "#ff00aa",
    detail: "Actively maintained by the team",
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-20 relative">
      {/* Background accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,245,255,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="section-label justify-center mb-4">Why ToolsBar</div>
          <h2 className="font-display text-3xl md:text-4xl font-black text-white mb-4">
            ENGINEERED DIFFERENT
          </h2>
          <p className="text-text-muted font-mono text-sm max-w-xl mx-auto">
            Most tool sites upload your files to their servers. We don't. Here's why that matters.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color, detail }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <div
                className="glass-panel p-6 h-full group hover:shadow-glass-hover transition-all duration-300 cursor-default"
                style={{
                  borderColor: "rgba(0,245,255,0.06)",
                }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: `${color}10`,
                    border: `1px solid ${color}25`,
                    boxShadow: `0 0 0 0 ${color}20`,
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color,
                      filter: `drop-shadow(0 0 6px ${color}60)`,
                    }}
                  />
                </div>

                {/* Content */}
                <h3
                  className="font-display text-sm font-bold tracking-widest mb-2 transition-colors duration-200"
                  style={{ color: "white" }}
                >
                  {title.toUpperCase()}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed mb-3">{desc}</p>

                {/* Detail tag */}
                <div
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded"
                  style={{
                    background: `${color}08`,
                    border: `1px solid ${color}20`,
                    color: `${color}90`,
                  }}
                >
                  <div
                    className="w-1 h-1 rounded-full"
                    style={{ background: color }}
                  />
                  {detail}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

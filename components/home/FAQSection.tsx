"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Are all ToolsBar tools completely free?",
    a: "Yes — all 15+ tools are 100% free to use with no usage limits. No subscription, no credit card, no account needed.",
  },
  {
    q: "Do my files get uploaded to your servers?",
    a: "Almost never. The vast majority of tools process files entirely inside your browser using WebAssembly and JavaScript. The only exception is PDF Split for very large files, which uses a secure backend that deletes your file immediately after processing.",
  },
  {
    q: "Which browsers are supported?",
    a: "All modern browsers are supported: Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+. For the best experience, we recommend Chrome or Edge. QR Scanner requires camera permission on mobile browsers.",
  },
  {
    q: "Is there a file size limit?",
    a: "Limits vary by tool. PDF tools support up to 50 MB. Image tools support up to 20 MB. TXT files up to 5 MB. These limits are set to ensure fast, smooth in-browser processing.",
  },
  {
    q: "Can I use ToolsBar on mobile?",
    a: "Yes. All tools are fully mobile-responsive. File upload, processing, and download work on iOS and Android. Some advanced tools like Text to PDF work best on desktop due to screen space.",
  },
  {
    q: "Why is PDF Split sometimes slower than other tools?",
    a: "PDF Split can fall back to our server-side processor for large or complex PDFs when browser-side processing hits memory limits. This gives more reliable results, at the cost of a few extra seconds.",
  },
  {
    q: "Will you add more tools?",
    a: "Yes. We actively develop and release new tools. If you have a request, send it via our Contact page — popular requests get prioritized.",
  },
  {
    q: "Is my data private?",
    a: "Completely. We don't read, store, or share your file contents. All browser-side processing happens in your own device's memory, which is cleared when you close the tab.",
  },
];

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, index, isOpen, onToggle }: FAQItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className="border-b border-neon-cyan/8 last:border-0"
    >
      <button
        className="w-full flex items-start gap-4 py-5 text-left group"
        onClick={onToggle}
      >
        <div
          className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center mt-0.5 transition-all duration-200"
          style={{
            background: isOpen ? "rgba(0,245,255,0.15)" : "rgba(0,245,255,0.05)",
            border: `1px solid ${isOpen ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.15)"}`,
          }}
        >
          {isOpen ? (
            <Minus className="w-3 h-3 text-neon-cyan" />
          ) : (
            <Plus className="w-3 h-3 text-text-muted group-hover:text-neon-cyan transition-colors" />
          )}
        </div>
        <span
          className={`font-mono text-sm font-medium leading-relaxed transition-colors duration-200 ${
            isOpen ? "text-neon-cyan" : "text-text-primary group-hover:text-white"
          }`}
        >
          {question}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p className="pl-10 pb-5 text-sm text-text-muted leading-relaxed font-mono">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: heading */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="lg:col-span-1"
        >
          <div className="section-label mb-4">FAQ</div>
          <h2 className="font-display text-3xl font-black text-white mb-4 leading-tight">
            COMMON QUESTIONS
          </h2>
          <p className="text-sm text-text-muted font-mono leading-relaxed">
            Everything you need to know before you start. Can't find an answer?{" "}
            <a href="/contact" className="text-neon-cyan hover:underline">
              Contact us →
            </a>
          </p>

          {/* Decorative terminal block */}
          <div
            className="mt-8 rounded-lg p-4 hidden lg:block"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(0,245,255,0.1)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-2 h-2 rounded-full bg-neon-red" />
              <div className="w-2 h-2 rounded-full bg-neon-yellow" />
              <div className="w-2 h-2 rounded-full bg-neon-green" />
            </div>
            <p className="text-xs font-mono text-neon-green">
              $ toolsbar --privacy<br />
              <span className="text-text-muted">→ Files never leave device</span><br />
              <span className="text-text-muted">→ No server logs</span><br />
              <span className="text-text-muted">→ No tracking</span><br />
              <span className="text-neon-cyan">✓ Privacy confirmed</span>
            </p>
          </div>
        </motion.div>

        {/* Right: FAQ items */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={i}
              question={item.q}
              answer={item.a}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

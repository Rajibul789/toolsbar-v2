"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCircle2, AlertCircle, Mail, MessageSquare } from "lucide-react";
import { SITE_CONFIG } from "@/config/site.config";

const schema = z.object({
  name:    z.string().min(2, "Name must be at least 2 characters"),
  email:   z.string().email("Please enter a valid email address"),
  subject: z.string().min(4, "Subject must be at least 4 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

type FormData = z.infer<typeof schema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setServerError(null);

    try {
      const formspreeId = SITE_CONFIG.contact.formspreeId;
      const endpoint = formspreeId
        ? `https://formspree.io/f/${formspreeId}`
        : `mailto:${SITE_CONFIG.contact.email}`;

      if (!formspreeId) {
        // Fallback: open mailto
        window.location.href = `mailto:${SITE_CONFIG.contact.email}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.message)}`;
        setSubmitted(true);
        return;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to send message");
      setSubmitted(true);
      reset();
    } catch {
      setServerError("Failed to send message. Please email us directly at hello@toolsbar.com");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="section-label justify-center mb-4">Contact</div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white mb-4">GET IN TOUCH</h1>
          <p className="text-text-muted font-mono text-sm max-w-lg mx-auto">
            Have a tool request, bug report, or general question? We read every message.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info sidebar */}
          <div className="space-y-5">
            <div className="glass-panel p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.2)" }}>
                  <Mail className="w-4 h-4 text-neon-cyan" />
                </div>
                <div>
                  <p className="text-xs font-mono font-semibold text-text-primary">Email</p>
                  <a href={`mailto:${SITE_CONFIG.contact.email}`} className="text-xs font-mono text-neon-cyan hover:underline">
                    {SITE_CONFIG.contact.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)" }}>
                  <MessageSquare className="w-4 h-4 text-neon-green" />
                </div>
                <div>
                  <p className="text-xs font-mono font-semibold text-text-primary">Response Time</p>
                  <p className="text-xs font-mono text-text-muted">Usually within 48 hours</p>
                </div>
              </div>
            </div>

            {/* Terminal status */}
            <div className="rounded-xl p-4 font-mono text-xs" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,245,255,0.08)" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                <span className="text-neon-green">SUPPORT ONLINE</span>
              </div>
              <p className="text-text-muted leading-relaxed">
                $ We prioritize:<br />
                <span className="text-neon-cyan">→</span> Bug reports<br />
                <span className="text-neon-cyan">→</span> Tool requests<br />
                <span className="text-neon-cyan">→</span> Feature ideas<br />
                <span className="text-neon-cyan">→</span> Business enquiries
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="glass-panel p-10 text-center h-full flex flex-col items-center justify-center gap-5">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.1 }}>
                    <CheckCircle2 className="w-16 h-16 text-neon-green mx-auto" />
                  </motion.div>
                  <div>
                    <h2 className="font-display text-xl font-black text-white mb-2">MESSAGE SENT</h2>
                    <p className="text-sm text-text-muted font-mono">Thank you! We'll get back to you within 48 hours.</p>
                  </div>
                  <button onClick={() => setSubmitted(false)} className="btn-neon text-sm">Send Another</button>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit(onSubmit)} className="glass-panel p-6 md:p-8 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Name</label>
                      <input {...register("name")} placeholder="Your name" className="input-cyber w-full" />
                      {errors.name && <p className="text-[11px] font-mono text-neon-red mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Email</label>
                      <input {...register("email")} type="email" placeholder="your@email.com" className="input-cyber w-full" />
                      {errors.email && <p className="text-[11px] font-mono text-neon-red mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Subject</label>
                    <input {...register("subject")} placeholder="Bug report, tool request, general question..." className="input-cyber w-full" />
                    {errors.subject && <p className="text-[11px] font-mono text-neon-red mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.subject.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Message</label>
                    <textarea {...register("message")} rows={6} placeholder="Describe your issue, idea, or question in detail..." className="input-cyber w-full resize-none" />
                    {errors.message && <p className="text-[11px] font-mono text-neon-red mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.message.message}</p>}
                  </div>

                  {serverError && (
                    <div className="rounded-lg px-4 py-3 flex items-start gap-2" style={{ background: "rgba(255,0,60,0.06)", border: "1px solid rgba(255,0,60,0.2)" }}>
                      <AlertCircle className="w-4 h-4 text-neon-red flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-mono text-neon-red">{serverError}</p>
                    </div>
                  )}

                  <button type="submit" disabled={isLoading}
                    className="w-full btn-neon py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm disabled:opacity-50">
                    {isLoading ? (
                      <><motion.div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />SENDING...</>
                    ) : (
                      <><Send className="w-4 h-4" />SEND MESSAGE</>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

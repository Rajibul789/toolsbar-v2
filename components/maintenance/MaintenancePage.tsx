import { Zap, Wrench, Clock } from "lucide-react";
import { GlitchText } from "@/components/animations/GlitchText";
import { MatrixRain } from "@/components/animations/MatrixRain";

/**
 * MaintenancePage — the full-screen "site is under maintenance" view.
 *
 * Used in two places:
 *  1. app/layout.tsx — rendered in place of {children} for every public
 *     route when maintenance mode is enabled (the actual gate).
 *  2. app/maintenance/page.tsx — a directly-visitable preview route at
 *     /maintenance so the admin can see exactly what it looks like
 *     without having to enable it site-wide first.
 *
 * Matches the site's existing cyberpunk design system (corner brackets,
 * neon glow, Matrix Rain, glitch text) rather than a generic placeholder.
 */
export function MaintenancePage() {
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "var(--abyss)" }}
    >
      {/* Matrix Rain background */}
      <div className="absolute inset-0 z-0 opacity-25">
        <MatrixRain opacity={0.12} color="#00f5ff" />
      </div>

      {/* Scan line overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,245,255,0.015) 2px, rgba(0,245,255,0.015) 4px)" }} />

      {/* Corner brackets */}
      <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-neon-cyan/40" />
      <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-neon-cyan/40" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-neon-cyan/40" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-neon-cyan/40" />

      {/* Content card */}
      <div className="relative z-10 text-center max-w-xl mx-auto px-6">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="relative w-12 h-12">
            <div
              className="w-12 h-12 rounded border border-neon-cyan/50 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(0,245,255,0.15), rgba(0,245,255,0.05))",
                boxShadow: "0 0 30px rgba(0,245,255,0.3)",
              }}
            >
              <Zap className="w-6 h-6 text-neon-cyan" />
            </div>
            {/* Pulsing ring */}
            <div
              className="absolute inset-0 rounded border border-neon-cyan/20 animate-ping"
              style={{ animationDuration: "2s" }}
            />
          </div>
          <GlitchText className="font-display text-2xl font-black tracking-wider text-white" active>
            TOOLSBAR
          </GlitchText>
        </div>

        {/* Wrench icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(0,245,255,0.12), rgba(191,0,255,0.08))",
            border: "1px solid rgba(0,245,255,0.25)",
            boxShadow: "0 0 40px rgba(0,245,255,0.15), inset 0 0 20px rgba(0,245,255,0.05)",
          }}
        >
          <Wrench
            className="w-9 h-9"
            style={{
              color: "var(--neon-cyan)",
              filter: "drop-shadow(0 0 8px rgba(0,245,255,0.8))",
            }}
          />
        </div>

        {/* Headline */}
        <h1 className="font-display text-4xl md:text-5xl font-black mb-4 tracking-wider"
          style={{
            background: "linear-gradient(135deg, #00f5ff 0%, #bf00ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
          UNDER MAINTENANCE
        </h1>

        {/* Divider */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.4))" }} />
          <span className="text-xs font-mono text-neon-cyan tracking-widest">// SYSTEM UPDATE IN PROGRESS</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(270deg, transparent, rgba(0,245,255,0.4))" }} />
        </div>

        {/* Message */}
        <p className="text-text-secondary font-mono text-sm leading-relaxed mb-8">
          We&apos;re performing scheduled maintenance to improve your experience.
          All your tools, files, and data remain safe.
          <br className="hidden sm:block" />
          <span className="text-neon-cyan/80">We&apos;ll be back shortly.</span>
        </p>

        {/* Status bar */}
        <div
          className="rounded-xl px-6 py-4 mb-8"
          style={{
            background: "rgba(0,245,255,0.04)",
            border: "1px solid rgba(0,245,255,0.12)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-neon-cyan flex-shrink-0"
              style={{ animation: "pulse 1.5s ease-in-out infinite", boxShadow: "0 0 6px rgba(0,245,255,0.8)" }} />
            <div className="flex-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,245,255,0.1)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "70%",
                    background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))",
                    boxShadow: "0 0 8px rgba(0,245,255,0.5)",
                    animation: "shimmer-sweep 2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
            <span className="text-xs font-mono text-neon-cyan/70 flex-shrink-0">70%</span>
          </div>
          <p className="text-[11px] font-mono text-text-muted mt-2 text-left">
            SYSTEM UPGRADE · ESTIMATED COMPLETION SOON
          </p>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: "🔒", label: "Your Files", value: "SAFE" },
            { icon: "⚡", label: "All Tools", value: "READY" },
            { icon: "🔄", label: "Status", value: "UPDATING" },
          ].map(({ icon, label, value }) => (
            <div key={label}
              className="rounded-lg p-3 text-center"
              style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)" }}>
              <div className="text-xl mb-1">{icon}</div>
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{label}</p>
              <p className="text-xs font-mono font-bold text-neon-cyan mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-text-muted">
          <Clock className="w-3 h-3" />
          <span>Check back in a few minutes</span>
        </div>

        <p className="text-[10px] font-mono text-text-muted/50 mt-4">
          TOOLSBAR · ALL TOOLS RUN IN YOUR BROWSER · ZERO UPLOADS
        </p>
      </div>
    </div>
  );
}
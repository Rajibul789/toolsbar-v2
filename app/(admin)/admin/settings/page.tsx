"use client";

/**
 * app/(admin)/admin/settings/page.tsx
 *
 * Admin Settings page.
 * Part 4: Added Developer Tools section with Error Reveal System toggle.
 */

import { useState } from "react";
import { Settings, Key, Shield, Bug, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useErrorReveal } from "@/lib/errors/error-context";

export default function AdminSettingsPage() {
  const { errorRevealEnabled, isLoading, setErrorRevealEnabled } = useErrorReveal();
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    setSaving(true);
    const next    = !errorRevealEnabled;
    const success = await setErrorRevealEnabled(next);
    setSaving(false);

    if (success) {
      toast.success(
        next
          ? "Error Reveal ON — full stack traces visible"
          : "Error Reveal OFF — friendly error pages active"
      );
    } else {
      toast.error("Failed to save setting — check your connection");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">SETTINGS</h1>
        <p className="text-xs font-mono text-text-muted">Admin account, security, and system preferences</p>
      </div>

      <div className="max-w-xl space-y-6">

        {/* ── Change password ─────────────────────────────────────── */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Key className="w-4 h-4 text-neon-cyan" />
            <h2 className="font-display text-sm font-bold text-white tracking-widest">CHANGE PASSWORD</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Current Password</label>
              <input type="password" placeholder="••••••••••" className="input-cyber w-full" autoComplete="current-password" />
            </div>
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">New Password</label>
              <input type="password" placeholder="••••••••••" className="input-cyber w-full" autoComplete="new-password" />
            </div>
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Confirm New Password</label>
              <input type="password" placeholder="••••••••••" className="input-cyber w-full" autoComplete="new-password" />
            </div>
            <button className="btn-neon text-sm font-mono px-5 py-2.5">Update Password</button>
          </div>
        </div>

        {/* ── Security ─────────────────────────────────────────────── */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Shield className="w-4 h-4 text-neon-green" />
            <h2 className="font-display text-sm font-bold text-white tracking-widest">SECURITY</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-neon-cyan/8">
              <div>
                <p className="text-xs font-mono text-text-primary">Session Duration</p>
                <p className="text-[11px] font-mono text-text-muted">How long admin sessions stay active</p>
              </div>
              <select className="input-cyber text-xs px-3 py-2 rounded-lg">
                <option value="7d">7 days</option>
                <option value="1d">24 hours</option>
                <option value="12h">12 hours</option>
              </select>
            </div>
            <form action="/api/auth/admin-logout" method="POST">
              <button type="submit" className="text-xs font-mono text-neon-red hover:underline">
                Sign out all sessions
              </button>
            </form>
          </div>
        </div>

        {/* ── Site Status ──────────────────────────────────────────── */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Settings className="w-4 h-4 text-neon-orange" />
            <h2 className="font-display text-sm font-bold text-white tracking-widest">SITE STATUS</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-text-primary">Maintenance Mode</p>
              <p className="text-[11px] font-mono text-text-muted">Show a maintenance page to all visitors</p>
            </div>
            <div
              className="w-12 h-6 rounded-full relative cursor-pointer transition-colors"
              style={{ background: "rgba(71,85,105,0.3)", border: "1px solid rgba(71,85,105,0.4)" }}
            >
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-text-muted transition-transform" />
            </div>
          </div>
        </div>

        {/* ── Developer Tools ───────────────────────────────────────── */}
        <div className="glass-panel p-6" style={{ border: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="flex items-center gap-2.5 mb-5">
            <Bug className="w-4 h-4" style={{ color: "#ef4444" }} />
            <h2 className="font-display text-sm font-bold tracking-widest" style={{ color: "#ef4444" }}>
              DEVELOPER TOOLS
            </h2>
          </div>

          {/* Error Reveal System toggle */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <p className="text-xs font-mono text-text-primary mb-1">Error Reveal System</p>
              <p className="text-[11px] font-mono text-text-muted leading-relaxed">
                {errorRevealEnabled
                  ? "ON — Full error panels with stack traces, file names, and component traces are shown when an error occurs."
                  : "OFF — Professional user-friendly error pages are shown. Technical details are hidden from users."
                }
              </p>

              {/* State indicator */}
              <div className="flex items-center gap-2 mt-3">
                {isLoading ? (
                  <span className="text-[11px] font-mono text-text-muted">Loading…</span>
                ) : errorRevealEnabled ? (
                  <>
                    <AlertTriangle size={11} style={{ color: "#f59e0b" }} />
                    <span className="text-[11px] font-mono" style={{ color: "#f59e0b" }}>
                      Real errors visible · Stack traces exposed
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={11} style={{ color: "#22c55e" }} />
                    <span className="text-[11px] font-mono" style={{ color: "#22c55e" }}>
                      Friendly error pages active · Technical info hidden
                    </span>
                  </>
                )}
              </div>

              {/* What changes by mode */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {/* ON */}
                <div style={{
                  padding: "10px 12px", borderRadius: "8px",
                  background: errorRevealEnabled ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${errorRevealEnabled ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)"}`,
                }}>
                  <p className="text-[10px] font-mono font-bold mb-1.5" style={{
                    color: errorRevealEnabled ? "#ef4444" : "rgba(255,255,255,0.25)",
                    letterSpacing: "0.08em",
                  }}>
                    WHEN ON
                  </p>
                  {["Real error messages", "Stack traces", "Component traces", "File names & lines"].map((item) => (
                    <p key={item} className="text-[10px] font-mono leading-relaxed"
                      style={{ color: errorRevealEnabled ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)" }}>
                      ✔ {item}
                    </p>
                  ))}
                </div>

                {/* OFF */}
                <div style={{
                  padding: "10px 12px", borderRadius: "8px",
                  background: !errorRevealEnabled ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${!errorRevealEnabled ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)"}`,
                }}>
                  <p className="text-[10px] font-mono font-bold mb-1.5" style={{
                    color: !errorRevealEnabled ? "#22c55e" : "rgba(255,255,255,0.25)",
                    letterSpacing: "0.08em",
                  }}>
                    WHEN OFF
                  </p>
                  {["Friendly error page", "Error ID shown", "Report Error button", "Technical info hidden"].map((item) => (
                    <p key={item} className="text-[10px] font-mono leading-relaxed"
                      style={{ color: !errorRevealEnabled ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)" }}>
                      ✔ {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Toggle switch */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <button
                onClick={handleToggle}
                disabled={saving || isLoading}
                title={errorRevealEnabled ? "Click to disable Error Reveal" : "Click to enable Error Reveal"}
                style={{
                  width: 52, height: 28,
                  borderRadius: "14px",
                  position: "relative",
                  cursor: saving || isLoading ? "not-allowed" : "pointer",
                  border: "none",
                  padding: 0,
                  background: isLoading
                    ? "rgba(71,85,105,0.3)"
                    : errorRevealEnabled
                    ? "rgba(239,68,68,0.7)"
                    : "rgba(34,197,94,0.7)",
                  boxShadow: isLoading ? "none"
                    : errorRevealEnabled
                    ? "0 0 12px rgba(239,68,68,0.4)"
                    : "0 0 12px rgba(34,197,94,0.4)",
                  transition: "all 0.25s ease",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <div style={{
                  position: "absolute",
                  top: 3,
                  left: errorRevealEnabled ? 27 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.25s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </button>
              <span className="text-[10px] font-mono font-bold" style={{
                color: isLoading
                  ? "rgba(255,255,255,0.3)"
                  : errorRevealEnabled
                  ? "#ef4444"
                  : "#22c55e",
                letterSpacing: "0.1em",
              }}>
                {isLoading ? "···" : errorRevealEnabled ? "ON" : "OFF"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
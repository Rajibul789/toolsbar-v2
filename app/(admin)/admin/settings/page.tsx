"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings, Key, Shield, Bug, Database,
  CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Eye, Server, Zap, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useErrorReveal } from "@/lib/errors/error-context";

// ── Types ─────────────────────────────────────────────────────────────────────
type CheckStatus = "success" | "warning" | "error";

interface HealthCheck {
  name:       string;
  status:     CheckStatus;
  message:    string;
  latencyMs?: number;
  detail?:    string;
}

interface HealthResponse {
  status:    CheckStatus;
  checks:    HealthCheck[];
  timestamp: string;
  provider:  string;
}

const STATUS_CONFIG: Record<CheckStatus, { icon: typeof CheckCircle2; color: string; bg: string; border: string; label: string }> = {
  success: { icon: CheckCircle2,  color: "#00ff88", bg: "rgba(0,255,136,0.08)",  border: "rgba(0,255,136,0.25)",  label: "Healthy" },
  warning: { icon: AlertTriangle, color: "#ffcc00", bg: "rgba(255,204,0,0.08)",  border: "rgba(255,204,0,0.25)",  label: "Slow"    },
  error:   { icon: XCircle,       color: "#ff003c", bg: "rgba(255,0,60,0.08)",   border: "rgba(255,0,60,0.25)",   label: "Down"    },
};

export default function AdminSettingsPage() {
  // ── Change Password ──────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving,        setPwSaving]        = useState(false);

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Fill in all three password fields.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation don't match.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Failed to change password.");
      toast.success("Password updated. Other sessions have been signed out.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  }

  // ── Session Duration ─────────────────────────────────────────────────────────
  const [sessionDuration, setSessionDuration] = useState("7d");
  const [sdSaving, setSdSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/session-duration")
      .then((r) => r.json())
      .then((d: { duration: string }) => setSessionDuration(d.duration))
      .catch(() => {});
  }, []);

  async function handleSessionDurationChange(value: string) {
    const previous = sessionDuration;
    setSessionDuration(value);
    setSdSaving(true);
    try {
      const res = await fetch("/api/admin/settings/session-duration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: value }),
      });
      if (!res.ok) throw new Error("Failed to save.");
      toast.success("Session duration updated — applies to new sign-ins.");
    } catch {
      setSessionDuration(previous);
      toast.error("Failed to save session duration.");
    } finally {
      setSdSaving(false);
    }
  }

  // ── Error Reveal System (original — uses context hook, not direct fetch) ─────
  const { errorRevealEnabled, isLoading: erLoading, setErrorRevealEnabled } = useErrorReveal();
  const [erSaving, setErSaving] = useState(false);

  async function handleToggle() {
    setErSaving(true);
    const next    = !errorRevealEnabled;
    const success = await setErrorRevealEnabled(next);
    setErSaving(false);

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

  // ── Maintenance Mode ─────────────────────────────────────────────────────────
  const [maintenanceOn,      setMaintenanceOn]      = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceSaving,  setMaintenanceSaving]  = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/maintenance")
      .then((r) => r.json())
      .then((d: { enabled: boolean }) => setMaintenanceOn(d.enabled))
      .catch(() => {})
      .finally(() => setMaintenanceLoading(false));
  }, []);

  async function toggleMaintenance() {
    const next = !maintenanceOn;
    if (next && !confirm(
      "Enable maintenance mode?\n\nThe ENTIRE public site will show a maintenance page immediately.\n/admin remains accessible so you can turn it back off."
    )) return;

    setMaintenanceSaving(true);
    setMaintenanceOn(next); // optimistic
    try {
      const res = await fetch("/api/admin/settings/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to update maintenance mode.");
      }
      toast.success(
        next
          ? "🔧 Maintenance mode ON — public site is now hidden."
          : "✅ Maintenance mode OFF — public site is live again."
      );
    } catch (err) {
      setMaintenanceOn(!next); // revert
      toast.error(err instanceof Error ? err.message : "Failed to update maintenance mode.");
    } finally {
      setMaintenanceSaving(false);
    }
  }

  // ── Database Health Check ────────────────────────────────────────────────────
  const [health,       setHealth]       = useState<HealthResponse | null>(null);
  const [healthLoading,setHealthLoading]= useState(true);
  const [healthError,  setHealthError]  = useState<string | null>(null);
  const [lastChecked,  setLastChecked]  = useState<Date | null>(null);

  const runHealthCheck = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch("/api/admin/health");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as HealthResponse;
      setHealth(data);
      setLastChecked(new Date());
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : "Health check failed");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => { void runHealthCheck(); }, [runHealthCheck]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => void runHealthCheck(), 30000);
    return () => clearInterval(interval);
  }, [runHealthCheck]);

  const overall    = health?.status ?? (healthError ? "error" : "warning");
  const overallCfg = STATUS_CONFIG[overall];
  const OverallIcon = overallCfg.icon;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">SETTINGS</h1>
        <p className="text-xs font-mono text-text-muted">Admin account, security, and system preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* ── Change Password ───────────────────────────────────────── */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Key className="w-4 h-4 text-neon-cyan" />
            <h2 className="font-display text-sm font-bold text-white tracking-widest">CHANGE PASSWORD</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Current Password</label>
              <input type="password" placeholder="••••••••••" className="input-cyber w-full" autoComplete="current-password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">New Password</label>
              <input type="password" placeholder="••••••••••" className="input-cyber w-full" autoComplete="new-password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Confirm New Password</label>
              <input type="password" placeholder="••••••••••" className="input-cyber w-full" autoComplete="new-password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button className="btn-neon text-sm font-mono px-5 py-2.5 disabled:opacity-50" onClick={handleChangePassword} disabled={pwSaving}>
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>

        {/* ── Security ──────────────────────────────────────────────── */}
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
              <select className="input-cyber text-xs px-3 py-2 rounded-lg disabled:opacity-50"
                value={sessionDuration} disabled={sdSaving}
                onChange={(e) => handleSessionDurationChange(e.target.value)}>
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

        {/* ── Site Status / Maintenance Mode ────────────────────────── */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Settings className="w-4 h-4 text-neon-orange" />
            <h2 className="font-display text-sm font-bold text-white tracking-widest">SITE STATUS</h2>
          </div>

          <div
            className="rounded-xl px-4 py-4 mb-3"
            style={{
              background: maintenanceOn ? "rgba(255,0,60,0.05)" : "transparent",
              border: `1px solid ${maintenanceOn ? "rgba(255,0,60,0.2)" : "rgba(0,245,255,0.08)"}`,
              transition: "all 0.3s",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-text-primary">
                  Maintenance Mode
                  {maintenanceOn && (
                    <span className="ml-2 text-[10px] font-bold" style={{ color: "#ff003c" }}>● ACTIVE</span>
                  )}
                </p>
                <p className="text-[11px] font-mono text-text-muted mt-0.5">
                  {maintenanceOn
                    ? "Public site is hidden. /admin panel remains accessible."
                    : "Show a maintenance page to all visitors"}
                </p>
              </div>
              <button
                onClick={toggleMaintenance}
                disabled={maintenanceLoading || maintenanceSaving}
                className="relative flex-shrink-0 disabled:opacity-50"
                style={{ width: 52, height: 28 }}
              >
                <div
                  className="absolute inset-0 rounded-full transition-colors duration-200"
                  style={{ background: maintenanceOn ? "rgba(255,0,60,0.7)" : "rgba(71,85,105,0.3)", border: `1px solid ${maintenanceOn ? "rgba(255,0,60,0.4)" : "rgba(71,85,105,0.4)"}` }}
                />
                <motion.div
                  className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow"
                  animate={{ left: maintenanceOn ? 27 : 3 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>

          <a
            href="/maintenance"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-neon-cyan transition-colors"
          >
            <Eye className="w-3 h-3" />Preview maintenance page →
          </a>
        </div>

        {/* ── Database Status & Health Check ────────────────────────── */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-neon-cyan" />
              <h2 className="font-display text-sm font-bold text-white tracking-widest">DATABASE STATUS</h2>
            </div>
            <button
              onClick={() => void runHealthCheck()}
              disabled={healthLoading}
              className="flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin" : ""}`} />
              {healthLoading ? "Checking…" : "Refresh"}
            </button>
          </div>

          {/* Overall banner */}
          <div
            className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
            style={{ background: overallCfg.bg, border: `1px solid ${overallCfg.border}` }}
          >
            <OverallIcon className="w-5 h-5 flex-shrink-0" style={{ color: overallCfg.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-bold" style={{ color: overallCfg.color }}>
                {healthError ? "Connection Failed" : `System ${overallCfg.label}`}
              </p>
              <p className="text-[11px] font-mono text-text-muted">
                {health?.provider ?? "PostgreSQL (Supabase)"}
                {lastChecked && ` · Last checked ${lastChecked.toLocaleTimeString()}`}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-text-muted/60 flex-shrink-0">
              <Clock className="w-3 h-3" />30s
            </div>
          </div>

          {healthError && (
            <div className="rounded-xl px-4 py-3 mb-4 text-xs font-mono"
              style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)", color: "#ff003c" }}>
              {healthError}
            </div>
          )}

          {/* Individual check cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
            <AnimatePresence mode="popLayout">
              {(health?.checks ?? []).map((check) => {
                const cfg  = STATUS_CONFIG[check.status];
                const Icon = cfg.icon;
                return (
                  <motion.div key={check.name} layout
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg px-3.5 py-3"
                    style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${cfg.border}` }}>
                    <div className="flex items-start gap-2.5">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-mono font-semibold text-text-primary truncate">{check.name}</p>
                          {check.latencyMs !== undefined && check.latencyMs > 0 && (
                            <span className="text-[10px] font-mono flex-shrink-0" style={{ color: cfg.color }}>{check.latencyMs}ms</span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-text-muted mt-0.5 leading-relaxed">{check.message}</p>
                        {check.detail && <p className="text-[10px] font-mono text-text-muted/50 mt-0.5">{check.detail}</p>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {healthLoading && !health && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg px-3.5 py-3 animate-pulse"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,245,255,0.06)" }}>
                <div className="h-2.5 w-2/3 rounded bg-white/5 mb-1.5" />
                <div className="h-2 w-1/2 rounded bg-white/5" />
              </div>
            ))}
          </div>

          {/* Stack reference */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-neon-cyan/8">
            {[
              { icon: Server,   label: "Provider", value: "Supabase"              },
              { icon: Database, label: "ORM",      value: "Prisma"               },
              { icon: Zap,      label: "Runtime",  value: "Next.js Route Handlers"},
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.06)" }}>
                <Icon className="w-3 h-3 text-neon-cyan/40" />
                <span className="text-[10px] font-mono text-text-muted">{label}:</span>
                <span className="text-[10px] font-mono text-text-primary">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Developer Tools / Error Reveal System ─────────────────── */}
        <div className="glass-panel p-6" style={{ border: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="flex items-center gap-2.5 mb-5">
            <Bug className="w-4 h-4" style={{ color: "#ef4444" }} />
            <h2 className="font-display text-sm font-bold tracking-widest" style={{ color: "#ef4444" }}>
              DEVELOPER TOOLS
            </h2>
          </div>

          {/* Error Reveal System toggle — full original UI restored */}
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
                {erLoading ? (
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

              {/* ON / OFF feature grids */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {/* When ON */}
                <div style={{
                  padding: "10px 12px", borderRadius: "8px",
                  background: errorRevealEnabled ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${errorRevealEnabled ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)"}`,
                }}>
                  <p className="text-[10px] font-mono font-bold mb-1.5" style={{
                    color: errorRevealEnabled ? "#ef4444" : "rgba(255,255,255,0.25)",
                    letterSpacing: "0.08em",
                  }}>WHEN ON</p>
                  {["Real error messages", "Stack traces", "Component traces", "File names & lines"].map((item) => (
                    <p key={item} className="text-[10px] font-mono leading-relaxed"
                      style={{ color: errorRevealEnabled ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)" }}>
                      ✔ {item}
                    </p>
                  ))}
                </div>

                {/* When OFF */}
                <div style={{
                  padding: "10px 12px", borderRadius: "8px",
                  background: !errorRevealEnabled ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${!errorRevealEnabled ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)"}`,
                }}>
                  <p className="text-[10px] font-mono font-bold mb-1.5" style={{
                    color: !errorRevealEnabled ? "#22c55e" : "rgba(255,255,255,0.25)",
                    letterSpacing: "0.08em",
                  }}>WHEN OFF</p>
                  {["Friendly error page", "Error ID shown", "Report Error button", "Technical info hidden"].map((item) => (
                    <p key={item} className="text-[10px] font-mono leading-relaxed"
                      style={{ color: !errorRevealEnabled ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)" }}>
                      ✔ {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Toggle switch — exact original styling */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <button
                onClick={handleToggle}
                disabled={erSaving || erLoading}
                title={errorRevealEnabled ? "Click to disable Error Reveal" : "Click to enable Error Reveal"}
                style={{
                  width: 52, height: 28, borderRadius: "14px",
                  position: "relative",
                  cursor: erSaving || erLoading ? "not-allowed" : "pointer",
                  border: "none", padding: 0,
                  background: erLoading
                    ? "rgba(71,85,105,0.3)"
                    : errorRevealEnabled
                    ? "rgba(239,68,68,0.7)"
                    : "rgba(34,197,94,0.7)",
                  boxShadow: erLoading ? "none"
                    : errorRevealEnabled
                    ? "0 0 12px rgba(239,68,68,0.4)"
                    : "0 0 12px rgba(34,197,94,0.4)",
                  transition: "all 0.25s ease",
                  opacity: erSaving ? 0.6 : 1,
                }}
              >
                <div style={{
                  position: "absolute", top: 3,
                  left: errorRevealEnabled ? 27 : 3,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#fff", transition: "left 0.25s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </button>
              <span className="text-[10px] font-mono font-bold" style={{
                color: erLoading
                  ? "rgba(255,255,255,0.3)"
                  : errorRevealEnabled ? "#ef4444" : "#22c55e",
                letterSpacing: "0.1em",
              }}>
                {erLoading ? "···" : errorRevealEnabled ? "ON" : "OFF"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
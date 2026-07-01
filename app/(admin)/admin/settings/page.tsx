"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings as SettingsIcon, Database, CheckCircle2, AlertTriangle,
  XCircle, RefreshCw, Power, Eye, EyeOff, Server, Zap, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────
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

// ── Status visual config ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<CheckStatus, { icon: typeof CheckCircle2; color: string; bg: string; border: string; label: string }> = {
  success: { icon: CheckCircle2, color: "#00ff88", bg: "rgba(0,255,136,0.08)", border: "rgba(0,255,136,0.25)", label: "Healthy" },
  warning: { icon: AlertTriangle, color: "#ffcc00", bg: "rgba(255,204,0,0.08)", border: "rgba(255,204,0,0.25)", label: "Slow" },
  error:   { icon: XCircle, color: "#ff003c", bg: "rgba(255,0,60,0.08)", border: "rgba(255,0,60,0.25)", label: "Down" },
};

export default function AdminSettingsPage() {
  // ── Error Reveal System (existing functionality — unchanged) ──────────────
  const [errorReveal, setErrorReveal] = useState(false);
  const [errorRevealLoading, setErrorRevealLoading] = useState(true);
  const [errorRevealSaving, setErrorRevealSaving] = useState(false);

  // ── Maintenance Mode (Part 7 — new) ─────────────────────────────────────────
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  // ── Database / Health Check System (Part 7 — new) ──────────────────────────
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // ── Load initial state ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadErrorReveal() {
      try {
        const res = await fetch("/api/admin/settings/error-reveal");
        if (res.ok) setErrorReveal((await res.json()).enabled);
      } catch { /* keep default */ }
      finally { setErrorRevealLoading(false); }
    }

    async function loadMaintenance() {
      try {
        const res = await fetch("/api/admin/settings/maintenance");
        if (res.ok) setMaintenanceOn((await res.json()).enabled);
      } catch { /* keep default */ }
      finally { setMaintenanceLoading(false); }
    }

    void loadErrorReveal();
    void loadMaintenance();
  }, []);

  // ── Health check fetcher (reusable for initial load + manual refresh) ──────
  const runHealthCheck = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch("/api/admin/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  // ── Toggle handlers ──────────────────────────────────────────────────────────
  async function toggleErrorReveal() {
    const next = !errorReveal;
    setErrorRevealSaving(true);
    setErrorReveal(next); // optimistic
    try {
      const res = await fetch("/api/admin/settings/error-reveal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Error Reveal ${next ? "enabled" : "disabled"}`);
    } catch {
      setErrorReveal(!next); // revert
      toast.error("Failed to update Error Reveal setting.");
    } finally {
      setErrorRevealSaving(false);
    }
  }

  async function toggleMaintenance() {
    const next = !maintenanceOn;
    if (next && !confirm("Enable maintenance mode? The ENTIRE public site will be hidden behind a maintenance page immediately. Only /admin remains accessible.")) {
      return;
    }
    setMaintenanceSaving(true);
    setMaintenanceOn(next); // optimistic
    try {
      const res = await fetch("/api/admin/settings/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "🔧 Maintenance mode ON — public site is now hidden." : "✅ Maintenance mode OFF — public site is live again.");
    } catch {
      setMaintenanceOn(!next); // revert
      toast.error("Failed to update maintenance mode.");
    } finally {
      setMaintenanceSaving(false);
    }
  }

  const overall = health?.status ?? (healthError ? "error" : "warning");
  const overallCfg = STATUS_CONFIG[overall];
  const OverallIcon = overallCfg.icon;

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.25)" }}>
          <SettingsIcon className="w-5 h-5 text-neon-cyan" />
        </div>
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest">SETTINGS</h1>
          <p className="text-xs font-mono text-text-muted">System configuration, database status, and site controls</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DATABASE STATUS & HEALTH CHECK SYSTEM
      ════════════════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm font-bold text-neon-cyan tracking-widest flex items-center gap-2">
            <Database className="w-4 h-4" />DATABASE STATUS
          </h2>
          <button
            onClick={() => void runHealthCheck()}
            disabled={healthLoading}
            className="flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-neon-cyan transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin" : ""}`} />
            {healthLoading ? "Checking…" : "Refresh"}
          </button>
        </div>

        {/* Overall status banner */}
        <div
          className="rounded-xl px-5 py-4 mb-4 flex items-center gap-4"
          style={{ background: overallCfg.bg, border: `1px solid ${overallCfg.border}` }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${overallCfg.color}15` }}>
            <OverallIcon className="w-5 h-5" style={{ color: overallCfg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono font-bold" style={{ color: overallCfg.color }}>
              {healthError ? "Connection Failed" : `System ${overallCfg.label}`}
            </p>
            <p className="text-[11px] font-mono text-text-muted">
              {health?.provider ?? "PostgreSQL (Supabase)"}
              {lastChecked && ` · Last checked ${lastChecked.toLocaleTimeString()}`}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-text-muted flex-shrink-0">
            <Clock className="w-3 h-3" />Auto-refresh: 30s
          </div>
        </div>

        {healthError && (
          <div className="rounded-xl px-5 py-4 mb-4 text-xs font-mono text-neon-red"
            style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}>
            Failed to reach health check endpoint: {healthError}
          </div>
        )}

        {/* Individual checks grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {(health?.checks ?? []).map((check) => {
              const cfg = STATUS_CONFIG[check.status];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={check.name}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl px-4 py-3.5"
                  style={{ background: "rgba(10,15,30,0.8)", border: `1px solid ${cfg.border}` }}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-mono font-semibold text-text-primary truncate">{check.name}</p>
                        {check.latencyMs !== undefined && check.latencyMs > 0 && (
                          <span className="text-[10px] font-mono flex-shrink-0" style={{ color: cfg.color }}>
                            {check.latencyMs}ms
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-text-muted mt-0.5 break-words">{check.message}</p>
                      {check.detail && (
                        <p className="text-[10px] font-mono text-text-muted/60 mt-1">{check.detail}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Loading skeletons on first load */}
          {healthLoading && !health && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl px-4 py-3.5 animate-pulse"
              style={{ background: "rgba(10,15,30,0.8)", border: "1px solid rgba(0,245,255,0.06)" }}>
              <div className="h-3 w-2/3 rounded bg-white/5 mb-2" />
              <div className="h-2.5 w-1/2 rounded bg-white/5" />
            </div>
          ))}
        </div>

        {/* Quick reference: stack summary */}
        <div className="flex flex-wrap gap-3 mt-4">
          {[
            { icon: Server,   label: "Provider",  value: "Supabase" },
            { icon: Database, label: "ORM",       value: "Prisma" },
            { icon: Zap,      label: "API",       value: "Next.js Route Handlers" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)" }}>
              <Icon className="w-3 h-3 text-neon-cyan/50" />
              <span className="text-[11px] font-mono text-text-muted">{label}:</span>
              <span className="text-[11px] font-mono text-text-primary">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          MAINTENANCE MODE
      ════════════════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        <h2 className="font-display text-sm font-bold text-neon-cyan tracking-widest mb-4 flex items-center gap-2">
          <Power className="w-4 h-4" />MAINTENANCE MODE
        </h2>

        <div
          className="rounded-xl px-5 py-4 flex items-center justify-between gap-4"
          style={{
            background: maintenanceOn ? "rgba(255,0,60,0.06)" : "rgba(10,15,30,0.8)",
            border: `1px solid ${maintenanceOn ? "rgba(255,0,60,0.3)" : "rgba(0,245,255,0.1)"}`,
          }}
        >
          <div className="min-w-0">
            <p className="text-sm font-mono font-semibold" style={{ color: maintenanceOn ? "#ff003c" : "#e2e8f0" }}>
              {maintenanceOn ? "🔴 Site is in Maintenance Mode" : "🟢 Site is Live"}
            </p>
            <p className="text-[11px] font-mono text-text-muted mt-1">
              {maintenanceOn
                ? "All public pages show the maintenance screen. The /admin panel remains accessible."
                : "Enabling this hides the entire public site behind a maintenance page immediately."}
            </p>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={maintenanceLoading || maintenanceSaving}
            className="relative w-14 h-7 rounded-full flex-shrink-0 transition-colors duration-200 disabled:opacity-50"
            style={{ background: maintenanceOn ? "#ff003c" : "rgba(255,255,255,0.12)" }}
          >
            <motion.div
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
              animate={{ left: maintenanceOn ? 30 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        <a href="/maintenance" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-neon-cyan transition-colors mt-3">
          <Eye className="w-3 h-3" />Preview maintenance page →
        </a>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          ERROR REVEAL SYSTEM (existing — unchanged functionality)
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="font-display text-sm font-bold text-neon-cyan tracking-widest mb-4 flex items-center gap-2">
          {errorReveal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          ERROR REVEAL SYSTEM
        </h2>

        <div className="rounded-xl px-5 py-4 flex items-center justify-between gap-4"
          style={{ background: "rgba(10,15,30,0.8)", border: "1px solid rgba(0,245,255,0.1)" }}>
          <div className="min-w-0">
            <p className="text-sm font-mono font-semibold text-text-primary">
              {errorReveal ? "Detailed errors visible to all users" : "Generic error messages for users"}
            </p>
            <p className="text-[11px] font-mono text-text-muted mt-1">
              When enabled, full stack traces and technical details appear in error panels for everyone —
              useful for active debugging, but should stay off in normal production use.
            </p>
          </div>
          <button
            onClick={toggleErrorReveal}
            disabled={errorRevealLoading || errorRevealSaving}
            className="relative w-14 h-7 rounded-full flex-shrink-0 transition-colors duration-200 disabled:opacity-50"
            style={{ background: errorReveal ? "var(--neon-cyan)" : "rgba(255,255,255,0.12)" }}
          >
            <motion.div
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
              animate={{ left: errorReveal ? 30 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
"use client";

/**
 * lib/errors/error-panel.tsx
 *
 * Professional Error Reveal Panel.
 * Shows real, complete error information for debugging.
 *
 * Two modes controlled by ErrorRevealContext:
 *   ON  → Full developer panel (stack trace, file, line, component, env, user)
 *   OFF → Friendly user page with Error ID + Report button (Part 4 wires toggle)
 *
 * Used by:
 *   - app/error.tsx            (route-level errors)
 *   - app/global-error.tsx     (layout-level errors)
 *   - lib/errors/error-boundary.tsx  (React render errors)
 */

import { useState, useCallback } from "react";
import {
  AlertTriangle, ChevronDown, ChevronRight, Copy, Check,
  RefreshCw, Home, Terminal, Layers, Globe, Monitor,
  FileCode, User, Cpu, Shield, Flag,
} from "lucide-react";
import { useErrorReveal } from "./error-context";
import { reportError } from "./reporter";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ErrorPanelProps {
  error: Error & { digest?: string; code?: string; meta?: unknown };
  reset?: () => void;
  componentStack?: string | null;
  /** Optionally override the detected route */
  route?: string;
  userId?: string | null;
  userRole?: string | null;
}

interface StackFrame {
  fn: string;
  file: string;
  line: string;
  col: string;
  isInternal: boolean;
}

// ─── Stack trace parser ───────────────────────────────────────────────────────

function parseStackFrames(stack: string): StackFrame[] {
  if (!stack) return [];
  return stack
    .split("\n")
    .slice(1)
    .map((raw): StackFrame | null => {
      const withFn = raw.match(/^\s*at (.+?) \((.+?):(\d+):(\d+)\)/);
      const noFn   = raw.match(/^\s*at (.+?):(\d+):(\d+)/);
      if (withFn) {
        const file = withFn[2];
        return {
          fn:         withFn[1].trim(),
          file,
          line:       withFn[3],
          col:        withFn[4],
          isInternal: isInternalFrame(file),
        };
      }
      if (noFn) {
        const file = noFn[1];
        return {
          fn:         "<anonymous>",
          file,
          line:       noFn[2],
          col:        noFn[3],
          isInternal: isInternalFrame(file),
        };
      }
      return null;
    })
    .filter((f): f is StackFrame => f !== null);
}

function isInternalFrame(file: string): boolean {
  return (
    file.includes("node_modules") ||
    file.includes("webpack-internal") ||
    file.includes("_next/static") ||
    file.includes("react-dom") ||
    file.includes("react-server-dom") ||
    file.includes("<anonymous>")
  );
}

function cleanFile(file: string): string {
  return file
    .replace(/webpack-internal:\/\/\//, "")
    .replace(/.*workspaces\/[^/]+\//, "")
    .replace(/.*\/\.next\//, ".next/")
    .replace(/\?.*$/, "");
}

function getFirstAppFrame(frames: StackFrame[]): StackFrame | null {
  return frames.find((f) => !f.isInternal) ?? frames[0] ?? null;
}

// ─── Browser / Device info ─────────────────────────────────────────────────────

function getBrowserInfo(): string {
  if (typeof navigator === "undefined") return "Server";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox/"))     return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] ?? ""}`;
  if (ua.includes("Edg/"))         return `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] ?? ""}`;
  if (ua.includes("Chrome/"))      return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] ?? ""}`;
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] ?? ""}`;
  return ua.slice(0, 60);
}

function getDeviceInfo(): string {
  if (typeof navigator === "undefined") return "Server";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua))   return "Android";
  if (/iPhone/i.test(ua))    return "iPhone";
  if (/iPad/i.test(ua))      return "iPad";
  if (/Macintosh/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua))   return "Windows";
  if (/Linux/i.test(ua))     return "Linux";
  return navigator.platform ?? "Unknown";
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const PANEL_STYLES = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.96)",
    zIndex: 99999,
    overflowY: "auto" as const,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  },
  container: {
    maxWidth: "860px",
    margin: "0 auto",
    padding: "24px 16px 80px",
  },
  badge: (color: string) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    border: `1px solid ${color}40`,
    background: `${color}12`,
    color,
  }),
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    padding: "16px",
    marginTop: "12px",
  },
  label: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.35)",
    marginBottom: "4px",
  },
  value: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.85)",
    wordBreak: "break-all" as const,
  },
  codeBlock: {
    background: "rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    padding: "12px",
    fontSize: "12px",
    lineHeight: 1.6,
    overflowX: "auto" as const,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
  },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, color = "rgba(255,255,255,0.85)" }: {
  label: string; value: React.ReactNode; color?: string;
}) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={PANEL_STYLES.label}>{label}</div>
      <div style={{ ...PANEL_STYLES.value, color }}>{value ?? "—"}</div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false, accentColor = "#00f5ff" }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...PANEL_STYLES.card, marginTop: "12px" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          width: "100%",
          textAlign: "left",
          color: accentColor,
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "inherit",
        }}
      >
        <Icon size={14} />
        {title}
        <span style={{ marginLeft: "auto" }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && <div style={{ marginTop: "12px" }}>{children}</div>}
    </div>
  );
}

// ─── Shared Report Error button ───────────────────────────────────────────────
// Used in both FriendlyErrorPage (user-facing) and ErrorPanel footer (developer).

type ReportStatus = "idle" | "loading" | "success" | "error";

interface ReportErrorButtonProps {
  error:      Error & { digest?: string };
  userId?:    string | null;
  role?:      string | null;
  route?:     string | null;
  toolSlug?:  string | null;
  blogSlug?:  string | null;
  /** "friendly" = minimal text link · "developer" = styled panel button */
  variant?:   "friendly" | "developer";
}

function ReportErrorButton({
  error, userId, role, route, toolSlug, blogSlug, variant = "friendly",
}: ReportErrorButtonProps) {
  const [status,   setStatus]   = useState<ReportStatus>("idle");
  const [reportId, setReportId] = useState<string | null>(null);

  const handleReport = useCallback(async () => {
    // Allow retry after error, block only while loading or already succeeded
    if (status === "loading" || status === "success") return;
    setStatus("loading");

    const result = await reportError({
      errorType:    error.name    || "Error",
      errorMessage: error.message || "Unknown error",
      stackTrace:   error.stack   ?? null,
      route:        route         ?? null,
      toolSlug:     toolSlug      ?? null,
      blogSlug:     blogSlug      ?? null,
      userId:       userId        ?? null,
      role:         role          ?? null,
      timestamp:    new Date().toISOString(),
    });

    if (result) {
      setStatus("success");
      setReportId(result.id);
    } else {
      setStatus("error");
    }
  }, [status, error, route, toolSlug, blogSlug, userId, role]);

  const label =
    status === "loading" ? "Submitting…"                          :
    status === "success" ? `Reported · ID: ${reportId?.slice(-8)}` :
    status === "error"   ? "Failed — tap to retry"                :
    "Report this error";

  if (variant === "developer") {
    return (
      <button
        onClick={handleReport}
        disabled={status === "loading" || status === "success"}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: status === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${status === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)"}`,
          color: status === "success" ? "#22c55e"
               : status === "loading" ? "rgba(239,68,68,0.35)"
               : status === "error"   ? "#f87171"
               : "rgba(239,68,68,0.6)",
          fontSize: "11px", padding: "6px 12px", borderRadius: "4px",
          cursor: status === "idle" || status === "error" ? "pointer" : "default",
          fontFamily: "inherit",
          transition: "all 0.2s",
        }}
      >
        <Flag size={11} />
        {label}
      </button>
    );
  }

  // Friendly variant — minimal text link style
  return (
    <button
      onClick={handleReport}
      disabled={status === "loading" || status === "success"}
      style={{
        marginTop: 16, background: "none", border: "none",
        color: status === "success" ? "#22c55e"
             : status === "error"   ? "#f87171"
             : "rgba(255,255,255,0.25)",
        fontSize: "12px",
        cursor: status === "idle" || status === "error" ? "pointer" : "default",
        fontFamily: "'JetBrains Mono', monospace",
        display: "flex", alignItems: "center", gap: "4px",
      }}
    >
      <Flag size={11} />
      {label}
    </button>
  );
}

// ─── Friendly fallback (error reveal OFF) ────────────────────────────────────
// Shown when the admin has disabled the Error Reveal toggle (Part 4).
// Restores the original project cyberpunk aesthetic without exposing
// any technical details to end users.

function FriendlyErrorPage({
  error, reset, userId, userRole,
}: {
  error:     Error & { digest?: string };
  reset?:    () => void;
  userId?:   string | null;
  userRole?: string | null;
}) {
  const errorId = error.digest ?? `ERR-${Date.now().toString(36).toUpperCase()}`;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      textAlign: "center",
      background: "#010610",
      backgroundImage: "linear-gradient(rgba(255,0,60,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,60,0.025) 1px, transparent 1px)",
      backgroundSize: "60px 60px",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Glowing icon */}
      <div style={{
        width: 96, height: 96, borderRadius: "16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(255,0,60,0.08)",
        border: "1px solid rgba(255,0,60,0.25)",
        boxShadow: "0 0 40px rgba(255,0,60,0.15)",
        marginBottom: 28,
        position: "relative",
      }}>
        <AlertTriangle size={40} color="#ff003c" />
        {/* Pulse ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "16px",
          border: "1px solid rgba(255,0,60,0.2)",
          animation: "pulse 2s ease-in-out infinite",
        }} />
      </div>

      {/* Status badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "4px 12px", borderRadius: "4px", marginBottom: 20,
        background: "rgba(255,0,60,0.08)", border: "1px solid rgba(255,0,60,0.25)",
        color: "#ff003c", fontSize: "11px", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff003c", display: "inline-block" }} />
        SYSTEM_ERROR · UNHANDLED_EXCEPTION
      </div>

      <h1 style={{
        color: "#ffffff", fontSize: "24px", fontWeight: 800,
        letterSpacing: "0.05em", textTransform: "uppercase",
        margin: "0 0 12px", fontFamily: "system-ui, sans-serif",
      }}>
        Something Went Wrong
      </h1>

      <p style={{
        color: "rgba(255,255,255,0.45)", fontSize: "14px", lineHeight: 1.6,
        maxWidth: "360px", margin: "0 0 24px",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}>
        An unexpected error occurred. The incident has been logged and our team has been notified.
      </p>

      {/* Terminal block */}
      <div style={{
        background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,0,60,0.15)",
        borderRadius: "12px", padding: "16px 20px", marginBottom: 28,
        textAlign: "left", maxWidth: 380, width: "100%",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}>
        {/* Terminal dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff003c" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
        </div>
        <div style={{ fontSize: "12px" }}>
          <span style={{ color: "#ff003c" }}>FATAL: </span>
          <span style={{ color: "rgba(255,255,255,0.5)" }}>
            {error.message?.slice(0, 80) ?? "Unknown error occurred"}
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
          Error ID: <span style={{ color: "rgba(255,255,255,0.4)" }}>{errorId}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {reset && (
          <button onClick={reset} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "10px 22px", borderRadius: "8px", cursor: "pointer",
            background: "rgba(255,0,60,0.1)", border: "1px solid rgba(255,0,60,0.4)",
            color: "#ff003c", fontSize: "13px", fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em",
          }}>
            <RefreshCw size={14} /> RETRY
          </button>
        )}
        <button onClick={() => { window.location.href = "/"; }} style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "10px 22px", borderRadius: "8px", cursor: "pointer",
          background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.3)",
          color: "#00f5ff", fontSize: "13px", fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em",
        }}>
          <Home size={14} /> Go Home
        </button>
      </div>

      {/* Part 2: Report Error — wired to /api/errors/report */}
      <ReportErrorButton
        error={error}
        userId={userId}
        role={userRole}
        variant="friendly"
      />
    </div>
  );
}

// ─── Main Error Panel ─────────────────────────────────────────────────────────

export function ErrorPanel({
  error,
  reset,
  componentStack,
  route: routeProp,
  userId,
  userRole,
}: ErrorPanelProps) {
  const { errorRevealEnabled } = useErrorReveal();
  const [copied, setCopied] = useState(false);
  const [showAllFrames, setShowAllFrames] = useState(false);

  const route = routeProp ?? (typeof window !== "undefined" ? window.location.pathname : "unknown");
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const environment = process.env.NODE_ENV ?? "unknown";
  const browser = getBrowserInfo();
  const device = getDeviceInfo();

  const frames = parseStackFrames(error.stack ?? "");
  const appFrames = frames.filter((f) => !f.isInternal);
  const firstAppFrame = getFirstAppFrame(frames);
  const displayedFrames = showAllFrames ? frames : frames.slice(0, 12);

  // Derive clean error metadata
  const errorType = error.name || error.constructor?.name || "Error";
  const errorCode = (error as { code?: string }).code ?? null;
  const errorDigest = error.digest ?? null;

  const copyAll = useCallback(() => {
    const text = [
      `Error Type:  ${errorType}`,
      `Message:     ${error.message}`,
      `Code:        ${errorCode ?? "—"}`,
      `Digest:      ${errorDigest ?? "—"}`,
      `Route:       ${route}`,
      `File:        ${firstAppFrame ? cleanFile(firstAppFrame.file) : "—"}`,
      `Function:    ${firstAppFrame?.fn ?? "—"}`,
      `Line:        ${firstAppFrame?.line ?? "—"}`,
      `Timestamp:   ${timestamp}`,
      `Environment: ${environment}`,
      `Browser:     ${browser}`,
      `Device:      ${device}`,
      `User ID:     ${userId ?? "unauthenticated"}`,
      `User Role:   ${userRole ?? "—"}`,
      ``,
      `Stack Trace:`,
      error.stack ?? "—",
      componentStack ? `\nComponent Stack:\n${componentStack}` : "",
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [error, errorType, errorCode, errorDigest, route, firstAppFrame, timestamp, environment, browser, device, userId, userRole, componentStack]);

  if (!errorRevealEnabled) {
    return (
      <FriendlyErrorPage
        error={error}
        reset={reset}
        userId={userId}
        userRole={userRole}
      />
    );
  }

  return (
    <div style={PANEL_STYLES.overlay}>
      <div style={PANEL_STYLES.container}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
              <span style={PANEL_STYLES.badge("#ef4444")}>
                <AlertTriangle size={11} /> Runtime Error
              </span>
              <span style={PANEL_STYLES.badge("#f59e0b")}>
                {environment}
              </span>
              {errorCode && (
                <span style={PANEL_STYLES.badge("#a78bfa")}>
                  Code: {errorCode}
                </span>
              )}
              {errorDigest && (
                <span style={PANEL_STYLES.badge("#6b7280")}>
                  digest: {errorDigest}
                </span>
              )}
            </div>
            <h1 style={{ color: "#ef4444", fontSize: "22px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              {errorType}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "15px", margin: "6px 0 0", lineHeight: 1.5 }}>
              {error.message || "An unexpected error occurred"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button onClick={copyAll} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", borderRadius: "6px", cursor: "pointer",
              background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
              color: copied ? "#22c55e" : "rgba(255,255,255,0.6)",
              fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
            }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy All"}
            </button>
            {reset && (
              <button onClick={reset} style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "6px", cursor: "pointer",
                background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.25)",
                color: "#00f5ff", fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
              }}>
                <RefreshCw size={13} /> Retry
              </button>
            )}
            <button onClick={() => { window.location.href = "/"; }} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", borderRadius: "6px", cursor: "pointer",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
            }}>
              <Home size={13} /> Home
            </button>
          </div>
        </div>

        {/* ── Core info grid ────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>

          {/* Location */}
          <div style={{ ...PANEL_STYLES.card, marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
              <FileCode size={13} color="#00f5ff" />
              <span style={{ color: "#00f5ff", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Location</span>
            </div>
            <InfoRow label="File" value={firstAppFrame ? cleanFile(firstAppFrame.file) : "—"} color="#fbbf24" />
            <InfoRow label="Function" value={firstAppFrame?.fn ?? "—"} color="#a78bfa" />
            <InfoRow label="Line : Col" value={firstAppFrame ? `${firstAppFrame.line} : ${firstAppFrame.col}` : "—"} color="#34d399" />
          </div>

          {/* Context */}
          <div style={{ ...PANEL_STYLES.card, marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
              <Globe size={13} color="#00f5ff" />
              <span style={{ color: "#00f5ff", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Context</span>
            </div>
            <InfoRow label="Route" value={route} color="#f472b6" />
            <InfoRow label="Timestamp" value={timestamp} />
            <InfoRow label="Environment" value={environment} color={environment === "production" ? "#ef4444" : "#34d399"} />
          </div>

          {/* System */}
          <div style={{ ...PANEL_STYLES.card, marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
              <Monitor size={13} color="#00f5ff" />
              <span style={{ color: "#00f5ff", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>System</span>
            </div>
            <InfoRow label="Browser" value={browser} />
            <InfoRow label="Device" value={device} />
          </div>

          {/* User */}
          <div style={{ ...PANEL_STYLES.card, marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
              <User size={13} color="#00f5ff" />
              <span style={{ color: "#00f5ff", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>User</span>
            </div>
            <InfoRow label="User ID" value={userId ?? "unauthenticated"} color={userId ? "#34d399" : "rgba(255,255,255,0.35)"} />
            <InfoRow label="Role" value={userRole ?? "—"} color={userRole ? "#a78bfa" : "rgba(255,255,255,0.35)"} />
          </div>

        </div>

        {/* ── Stack Trace ───────────────────────────────────────────────── */}
        <CollapsibleSection title="Stack Trace" icon={Terminal} defaultOpen={true} accentColor="#ef4444">
          <div style={PANEL_STYLES.codeBlock}>
            {displayedFrames.length > 0 ? (
              displayedFrames.map((frame, i) => (
                <div key={i} style={{
                  padding: "3px 0",
                  opacity: frame.isInternal ? 0.35 : 1,
                  borderLeft: !frame.isInternal ? "2px solid #ef444460" : "2px solid transparent",
                  paddingLeft: "8px",
                  marginBottom: "2px",
                }}>
                  <span style={{ color: "#a78bfa" }}>at </span>
                  <span style={{ color: !frame.isInternal ? "#fbbf24" : "rgba(255,255,255,0.5)" }}>{frame.fn}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}> (</span>
                  <span style={{ color: !frame.isInternal ? "#34d399" : "rgba(255,255,255,0.4)" }}>{cleanFile(frame.file)}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>:</span>
                  <span style={{ color: "#f472b6" }}>{frame.line}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>:{frame.col})</span>
                </div>
              ))
            ) : (
              <span style={{ color: "rgba(255,255,255,0.35)" }}>{error.stack || "No stack trace available"}</span>
            )}
          </div>
          {frames.length > 12 && (
            <button
              onClick={() => setShowAllFrames((v) => !v)}
              style={{ marginTop: "8px", background: "none", border: "none", color: "#00f5ff", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
            >
              {showAllFrames ? "Show fewer frames" : `Show all ${frames.length} frames`}
            </button>
          )}
          {appFrames.length > 0 && (
            <div style={{ marginTop: "8px", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
              {appFrames.length} app frame{appFrames.length !== 1 ? "s" : ""} · {frames.length - appFrames.length} internal frames
            </div>
          )}
        </CollapsibleSection>

        {/* ── Component Stack ───────────────────────────────────────────── */}
        {componentStack && (
          <CollapsibleSection title="Component Stack" icon={Layers} defaultOpen={false} accentColor="#a78bfa">
            <div style={{ ...PANEL_STYLES.codeBlock, color: "#a78bfa99" }}>
              {componentStack.trim().split("\n").map((line, i) => (
                <div key={i} style={{ padding: "2px 0" }}>
                  <span style={{ color: "#a78bfa" }}>{line.trim()}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* ── Raw Error Object ─────────────────────────────────────────── */}
        <CollapsibleSection title="Raw Error Object" icon={Cpu} defaultOpen={false} accentColor="#6b7280">
          <div style={PANEL_STYLES.codeBlock}>
            <pre style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>
              {JSON.stringify(
                {
                  name: error.name,
                  message: error.message,
                  code: (error as { code?: string }).code,
                  digest: error.digest,
                  meta: (error as { meta?: unknown }).meta,
                },
                null,
                2
              )}
            </pre>
          </div>
        </CollapsibleSection>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{
          marginTop: "24px", padding: "12px 16px",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "8px",
        }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Shield size={11} />
            Error Reveal System · ToolsBar v2 · {environment}
          </div>
          {/* Part 2: Report Error — wired to /api/errors/report */}
          <ReportErrorButton
            error={error}
            userId={userId}
            role={userRole}
            route={route}
            toolSlug={(error as { toolSlug?: string }).toolSlug ?? null}
            blogSlug={(error as { blogSlug?: string }).blogSlug ?? null}
            variant="developer"
          />
        </div>

      </div>
    </div>
  );
}
